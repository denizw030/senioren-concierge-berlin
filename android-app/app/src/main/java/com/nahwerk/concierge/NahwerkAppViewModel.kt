package com.nahwerk.concierge

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.nahwerk.concierge.data.ChatMessage
import com.nahwerk.concierge.data.HomeContext
import com.nahwerk.concierge.data.NahwerkApi
import com.nahwerk.concierge.data.PendingChatRequest
import com.nahwerk.concierge.data.PendingChatStore
import com.nahwerk.concierge.data.SecureSessionStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

internal enum class AppScreen { LOGIN, HOME, CHAT, REMINDERS, SETTINGS }

internal data class AppUiState(
    val screen: AppScreen,
    val home: HomeContext? = null,
    val loading: Boolean = false,
    val loginBusy: Boolean = false,
    val error: String? = null,
    val notice: String? = null,
    val chatMessages: List<ChatMessage> = emptyList(),
    val chatDraft: String = "",
    val chatSending: Boolean = false,
    val chatError: String? = null,
    val pendingRequest: PendingChatRequest? = null
)

internal class NahwerkAppViewModel(
    application: Application,
    private val savedStateHandle: SavedStateHandle
) : AndroidViewModel(application) {
    companion object {
        private const val SCREEN_KEY = "app_screen"
        private const val CHAT_MESSAGES_KEY = "chat_messages_json"
        private const val CHAT_DRAFT_KEY = "chat_draft"
        private const val CHAT_OWNER_KEY = "chat_owner"
    }

    private val sessions = SecureSessionStore(application.applicationContext)
    private val pendingChats = PendingChatStore(application.applicationContext)
    private val api = NahwerkApi(sessions, pendingChats)

    private val initialScreen = if (api.hasSession()) {
        savedStateHandle.get<String>(SCREEN_KEY)
            ?.let { runCatching { AppScreen.valueOf(it) }.getOrNull() }
            ?.takeUnless { it == AppScreen.LOGIN }
            ?: AppScreen.HOME
    } else {
        AppScreen.LOGIN
    }

    private val _uiState = MutableStateFlow(
        AppUiState(
            screen = initialScreen,
            loading = api.hasSession(),
            chatMessages = restoreMessages(),
            chatDraft = savedStateHandle.get<String>(CHAT_DRAFT_KEY).orEmpty(),
            pendingRequest = api.pendingChatRequest()
        )
    )
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    init {
        persistScreen(initialScreen)
        if (api.hasSession()) refreshHome(forceHome = false)
    }

    fun login(email: String, password: String) {
        if (_uiState.value.loginBusy) return
        _uiState.value = _uiState.value.copy(loginBusy = true, error = null, notice = null)
        viewModelScope.launch {
            val result = api.login(email, password)
            if (!result.ok) {
                _uiState.value = _uiState.value.copy(loginBusy = false, error = result.error)
                return@launch
            }
            synchronizeChatOwner(clearOnMissing = true)
            _uiState.value = _uiState.value.copy(loginBusy = false, pendingRequest = api.pendingChatRequest())
            refreshHome(forceHome = true)
        }
    }

    fun requestPasswordReset(email: String) {
        if (email.isBlank() || _uiState.value.loginBusy) return
        _uiState.value = _uiState.value.copy(loginBusy = true, error = null, notice = null)
        viewModelScope.launch {
            val ok = api.requestPasswordReset(email)
            _uiState.value = _uiState.value.copy(
                loginBusy = false,
                notice = if (ok) "Wenn die Adresse registriert ist, wurde eine Rücksetz-E-Mail angefordert." else null,
                error = if (ok) null else "Die Anfrage konnte gerade nicht gesendet werden."
            )
        }
    }

    fun refreshHome(forceHome: Boolean = false) {
        if (!api.hasSession()) {
            moveToLogin("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.")
            return
        }
        val current = _uiState.value
        _uiState.value = current.copy(loading = true, error = null, notice = null)
        viewModelScope.launch {
            api.loadHome()
                .onSuccess { home ->
                    synchronizeChatOwner(clearOnMissing = false)
                    val withGreeting = ensureGreeting(_uiState.value.chatMessages, home)
                    val target = if (forceHome || _uiState.value.screen == AppScreen.LOGIN) AppScreen.HOME else _uiState.value.screen
                    _uiState.value = _uiState.value.copy(
                        screen = target,
                        home = home,
                        loading = false,
                        error = null,
                        chatMessages = withGreeting,
                        pendingRequest = api.pendingChatRequest()
                    )
                    persistScreen(target)
                    persistChatState()
                }
                .onFailure { failure ->
                    if (!api.hasSession()) {
                        moveToLogin(failure.message ?: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.")
                    } else {
                        _uiState.value = _uiState.value.copy(
                            loading = false,
                            error = failure.message ?: "Konto konnte nicht geladen werden."
                        )
                    }
                }
        }
    }

    fun open(screen: AppScreen) {
        if (screen == AppScreen.LOGIN || _uiState.value.home == null) return
        _uiState.value = _uiState.value.copy(screen = screen, error = null, notice = null)
        persistScreen(screen)
    }

    fun goHome() {
        if (_uiState.value.home == null) return
        _uiState.value = _uiState.value.copy(screen = AppScreen.HOME, error = null, notice = null)
        persistScreen(AppScreen.HOME)
    }

    fun updateDraft(value: String) {
        if (value.length > 4000) return
        _uiState.value = _uiState.value.copy(chatDraft = value)
        savedStateHandle[CHAT_DRAFT_KEY] = value
    }

    fun sendChat() {
        val state = _uiState.value
        if (state.chatSending || state.pendingRequest != null) return
        val text = state.chatDraft.trim()
        if (text.isEmpty()) return
        val request = try {
            api.createChatRequest(text)
        } catch (_: Exception) {
            _uiState.value = state.copy(chatError = "Nachricht konnte nicht sicher vorbereitet werden.")
            return
        }
        val messages = state.chatMessages + ChatMessage("user", request.message, request.sourceMessageId)
        _uiState.value = state.copy(
            chatMessages = messages,
            chatDraft = "",
            chatSending = true,
            chatError = null,
            pendingRequest = request
        )
        persistChatState()
        sendPending(request)
    }

    fun retryPending() {
        val state = _uiState.value
        val request = state.pendingRequest ?: api.pendingChatRequest() ?: return
        if (state.chatSending) return
        val messages = if (state.chatMessages.any { it.sourceMessageId == request.sourceMessageId }) {
            state.chatMessages
        } else {
            state.chatMessages + ChatMessage("user", request.message, request.sourceMessageId)
        }
        _uiState.value = state.copy(chatMessages = messages, chatSending = true, chatError = null, pendingRequest = request)
        persistChatState()
        sendPending(request)
    }

    fun discardPending() {
        val request = _uiState.value.pendingRequest ?: return
        if (_uiState.value.chatSending) return
        if (api.discardPendingChat(request.sourceMessageId)) {
            _uiState.value = _uiState.value.copy(pendingRequest = null, chatError = null)
        } else {
            _uiState.value = _uiState.value.copy(chatError = "Die ausstehende Nachricht konnte lokal nicht sicher verworfen werden.")
        }
    }

    fun logout() {
        api.logout()
        clearChatState()
        _uiState.value = AppUiState(screen = AppScreen.LOGIN)
        persistScreen(AppScreen.LOGIN)
    }

    private fun sendPending(request: PendingChatRequest) {
        viewModelScope.launch {
            val result = api.sendText(request)
            val current = _uiState.value
            if (result.ok && !result.text.isNullOrBlank()) {
                _uiState.value = current.copy(
                    chatMessages = current.chatMessages + ChatMessage("assistant", result.text),
                    chatSending = false,
                    chatError = null,
                    pendingRequest = null
                )
            } else {
                _uiState.value = current.copy(
                    chatSending = false,
                    chatError = result.error ?: "Keine bestätigte Antwort erhalten. Derselbe Request kann sicher erneut versucht werden.",
                    pendingRequest = api.pendingChatRequest()
                )
            }
            persistChatState()
            if (!api.hasSession()) moveToLogin("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.")
        }
    }

    private fun synchronizeChatOwner(clearOnMissing: Boolean) {
        val owner = api.accountKey()
        val savedOwner = savedStateHandle.get<String>(CHAT_OWNER_KEY)
        if (owner.isNullOrBlank()) {
            if (clearOnMissing) clearChatState()
            return
        }
        if (savedOwner != owner) {
            clearChatState()
            savedStateHandle[CHAT_OWNER_KEY] = owner
        }
    }

    private fun ensureGreeting(messages: List<ChatMessage>, home: HomeContext): List<ChatMessage> {
        return if (messages.isEmpty()) listOf(ChatMessage("assistant", home.greeting)) else messages
    }

    private fun moveToLogin(message: String) {
        clearChatState()
        _uiState.value = AppUiState(screen = AppScreen.LOGIN, error = message)
        persistScreen(AppScreen.LOGIN)
    }

    private fun clearChatState() {
        savedStateHandle.remove<String>(CHAT_MESSAGES_KEY)
        savedStateHandle.remove<String>(CHAT_DRAFT_KEY)
        savedStateHandle.remove<String>(CHAT_OWNER_KEY)
    }

    private fun persistScreen(screen: AppScreen) {
        savedStateHandle[SCREEN_KEY] = screen.name
    }

    private fun persistChatState() {
        savedStateHandle[CHAT_DRAFT_KEY] = _uiState.value.chatDraft
        val array = JSONArray()
        _uiState.value.chatMessages.forEach { message ->
            array.put(
                JSONObject()
                    .put("role", message.role)
                    .put("text", message.text)
                    .put("source_message_id", message.sourceMessageId ?: JSONObject.NULL)
            )
        }
        savedStateHandle[CHAT_MESSAGES_KEY] = array.toString()
    }

    private fun restoreMessages(): List<ChatMessage> {
        val encoded = savedStateHandle.get<String>(CHAT_MESSAGES_KEY).orEmpty()
        if (encoded.isBlank()) return emptyList()
        return runCatching {
            val array = JSONArray(encoded)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val role = item.optString("role")
                    val text = item.optString("text")
                    if (role.isBlank() || text.isBlank()) continue
                    val source = item.optString("source_message_id").takeIf { it.isNotBlank() && it != "null" }
                    add(ChatMessage(role, text, source))
                }
            }
        }.getOrDefault(emptyList())
    }
}

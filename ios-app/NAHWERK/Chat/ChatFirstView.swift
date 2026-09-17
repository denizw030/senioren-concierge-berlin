import SwiftUI

struct LocalChatMessage: Identifiable, Equatable {
    enum Role {
        case user
        case assistant
        case system
    }

    let id: UUID
    let role: Role
    let text: String
    let actions: [RawUIAction]

    init(id: UUID = UUID(), role: Role, text: String, actions: [RawUIAction] = []) {
        self.id = id
        self.role = role
        self.text = text
        self.actions = actions.filter { $0.allowedType != nil }
    }
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [LocalChatMessage] = []
    @Published private(set) var historyThreads: [HistoryThread] = []
    @Published private(set) var personaName = "NAHWERK Concierge"
    @Published var busy = false
    @Published var error: String?

    private let api: NAHWERKAPI

    init(api: NAHWERKAPI) {
        self.api = api
    }

    func send(_ raw: String, token: String?) async {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !busy else { return }

        error = nil
        messages.append(LocalChatMessage(role: .user, text: text))
        busy = true
        defer { busy = false }

        do {
            let response: AppChatResponse
            if let token {
                response = try await api.sendAuthenticatedChat(token: token, message: text)
            } else {
                response = try await api.sendGuestChat(message: text)
            }

            guard response.environment == "PROD",
                  response.authoritative != false,
                  let core = response.core,
                  !core.customerText.isEmpty else {
                throw NAHWERKAPIError.invalidResponse
            }

            messages.append(
                LocalChatMessage(
                    role: .assistant,
                    text: core.customerText,
                    actions: core.allowedActions
                )
            )
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Die Nachricht konnte gerade nicht gesendet werden."
        }
    }

    func refreshIdentity(token: String) async {
        do {
            let response = try await api.loadMe(token: token)
            guard response.environment == "PROD", response.authoritative != false else {
                throw NAHWERKAPIError.invalidResponse
            }
            personaName = response.persona?.customerName ?? "NAHWERK Concierge"
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription
        }
    }

    func refreshHistory(token: String) async {
        do {
            historyThreads = try await api.historyThreads(token: token)
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription
        }
    }

    func openHistory(_ thread: HistoryThread, token: String) async {
        do {
            let items = try await api.historyMessages(token: token, threadID: thread.threadID)
            let mapped = items.compactMap { item -> LocalChatMessage? in
                let text = item.customerText
                guard !text.isEmpty else { return nil }
                let role: LocalChatMessage.Role = (item.role ?? "").lowercased().contains("assistant") ? .assistant : .user
                return LocalChatMessage(role: role, text: text)
            }
            if !mapped.isEmpty {
                messages = mapped
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription
        }
    }

    func newChat(isAuthenticated: Bool) {
        if isAuthenticated {
            error = NAHWERKAPIError.canonicalNewChatUnavailable.errorDescription
        } else {
            error = nil
            messages = []
        }
    }
}

private enum CustomerDestination: String, Identifiable {
    case concierge
    case email
    case safety
    case usage
    case personalData

    var id: String { rawValue }

    var title: String {
        switch self {
        case .concierge: "Concierge"
        case .email: "E-Mail"
        case .safety: "Safety"
        case .usage: "Nutzung"
        case .personalData: "Persönliche Daten"
        }
    }

    var guestMessage: String {
        switch self {
        case .concierge:
            "Für deinen persönlichen Concierge musst du dich anmelden."
        case .email:
            "Damit NAHWERK dein E-Mail-Konto sicher verbinden kann, musst du dich anmelden."
        case .safety:
            "Safety-Einstellungen sind persönlich und werden erst nach sicherer Anmeldung geöffnet."
        case .usage:
            "Tarif und Nutzung werden nach der Anmeldung aus deinem Kundenkonto geladen."
        case .personalData:
            "Persönliche Daten werden erst nach sicherer Anmeldung angezeigt."
        }
    }
}

private enum AuthMode {
    case login
    case register
}

struct ChatFirstView: View {
    @ObservedObject var model: ChatViewModel
    @ObservedObject var session: SessionStore

    @State private var draft = ""
    @State private var showMenu = false
    @State private var authMode: AuthMode?
    @State private var destination: CustomerDestination?

    var body: some View {
        NavigationStack {
            ZStack {
                NahwerkDesign.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    topBar
                    Divider().overlay(NahwerkDesign.divider)
                    chatBody
                    composer
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .sheet(isPresented: $showMenu) {
            menuSheet
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(NahwerkDesign.surface)
        }
        .sheet(item: Binding(
            get: { authMode.map(AuthSheetToken.init) },
            set: { token in authMode = token?.mode }
        )) { token in
            AuthView(
                initialMode: token.mode,
                session: session,
                onAuthenticated: {
                    authMode = nil
                    Task {
                        if let token = session.validToken {
                            await model.refreshIdentity(token: token)
                            await model.refreshHistory(token: token)
                        }
                    }
                }
            )
        }
        .sheet(item: $destination) { target in
            if let token = session.validToken {
                ProtectedFeatureView(destination: target, token: token)
            } else {
                AccountRequiredView(
                    destination: target,
                    onLogin: {
                        destination = nil
                        authMode = .login
                    },
                    onRegister: {
                        destination = nil
                        authMode = .register
                    }
                )
            }
        }
        .task(id: session.validToken) {
            if let token = session.validToken {
                await model.refreshIdentity(token: token)
                await model.refreshHistory(token: token)
            }
        }
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Button {
                showMenu = true
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.title3.weight(.semibold))
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Menü")

            VStack(alignment: .leading, spacing: 1) {
                Text("NAHWERK")
                    .font(.headline)
                    .foregroundStyle(NahwerkDesign.primaryText)
                if session.isAuthenticated {
                    Text(model.personaName)
                        .font(.caption)
                        .foregroundStyle(NahwerkDesign.secondaryText)
                        .lineLimit(1)
                }
            }

            Spacer()

            if !session.isAuthenticated {
                Button("Anmelden") {
                    authMode = .login
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(NahwerkDesign.gold)
                .frame(minHeight: NahwerkDesign.touchHeight)
                .accessibilityIdentifier("top_login")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(NahwerkDesign.background)
    }

    @ViewBuilder
    private var chatBody: some View {
        if model.messages.isEmpty {
            VStack {
                Spacer()
                Text("Wie kann ich dir helfen?")
                    .font(.system(.title2, design: .rounded, weight: .semibold))
                    .foregroundStyle(NahwerkDesign.primaryText)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("empty_chat_title")
                Spacer()
            }
            .frame(maxWidth: .infinity)
        } else {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 18) {
                        ForEach(model.messages) { message in
                            MessageRow(
                                message: message,
                                onAction: handle(action:)
                            )
                            .id(message.id)
                        }

                        if let error = model.error {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(NahwerkDesign.error)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 16)
                                .accessibilityIdentifier("chat_error")
                        }
                    }
                    .padding(.vertical, 18)
                }
                .onChange(of: model.messages.count) {
                    if let last = model.messages.last {
                        withAnimation(.easeOut(duration: 0.22)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }
        }
    }

    private var composer: some View {
        VStack(spacing: 8) {
            if model.messages.isEmpty, let error = model.error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(NahwerkDesign.error)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("chat_error")
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField("Nachricht an NAHWERK", text: $draft, axis: .vertical)
                    .lineLimit(1...5)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .foregroundStyle(NahwerkDesign.primaryText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(NahwerkDesign.surface, in: RoundedRectangle(cornerRadius: 22))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22)
                            .stroke(NahwerkDesign.divider, lineWidth: 1)
                    )
                    .accessibilityIdentifier("guest_chat_input")

                Button {
                    let text = draft
                    draft = ""
                    Task {
                        await model.send(text, token: session.validToken)
                    }
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.body.weight(.bold))
                        .foregroundStyle(Color.black)
                        .frame(width: 44, height: 44)
                        .background(NahwerkDesign.gold, in: Circle())
                }
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.busy)
                .opacity(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.45 : 1)
                .accessibilityLabel("Senden")
                .accessibilityIdentifier("guest_chat_send")
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 10)
        .background(NahwerkDesign.background)
    }

    private var menuSheet: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        model.newChat(isAuthenticated: session.isAuthenticated)
                        showMenu = false
                    } label: {
                        Label("Neuer Chat", systemImage: "square.and.pencil")
                    }
                }

                if session.isAuthenticated {
                    Section("Gesprächsverlauf") {
                        if model.historyThreads.isEmpty {
                            Text("Noch kein gespeicherter Verlauf verfügbar.")
                                .foregroundStyle(NahwerkDesign.secondaryText)
                        } else {
                            ForEach(model.historyThreads) { thread in
                                Button {
                                    showMenu = false
                                    if let token = session.validToken {
                                        Task { await model.openHistory(thread, token: token) }
                                    }
                                } label: {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(thread.title ?? "NAHWERK Concierge")
                                            .foregroundStyle(NahwerkDesign.primaryText)
                                        if let preview = thread.preview, !preview.isEmpty {
                                            Text(preview)
                                                .font(.caption)
                                                .foregroundStyle(NahwerkDesign.secondaryText)
                                                .lineLimit(1)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Section("Gesprächsverlauf") {
                        Text("Gespeicherte Chats erscheinen nach der Anmeldung.")
                            .foregroundStyle(NahwerkDesign.secondaryText)
                    }
                }

                Section {
                    featureButton(.concierge)
                    featureButton(.email)
                    featureButton(.safety)
                    featureButton(.usage)
                    featureButton(.personalData)
                }

                Section {
                    if session.isAuthenticated {
                        Button("Abmelden", role: .destructive) {
                            guard let token = session.validToken else {
                                session.clear()
                                showMenu = false
                                return
                            }
                            Task {
                                await NAHWERKAPI.production.logout(token: token)
                                await MainActor.run {
                                    session.clear()
                                    showMenu = false
                                }
                            }
                        }
                    } else {
                        Button("Anmelden") {
                            showMenu = false
                            authMode = .login
                        }
                        Button("Kostenlos registrieren") {
                            showMenu = false
                            authMode = .register
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(NahwerkDesign.surface)
            .navigationTitle("NAHWERK")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    private func featureButton(_ target: CustomerDestination) -> some View {
        Button(target.title) {
            showMenu = false
            destination = target
        }
    }

    private func handle(action: RawUIAction) {
        guard let type = action.allowedType else { return }
        switch type {
        case .signUp:
            authMode = .register
        case .signIn:
            authMode = .login
        case .configureConcierge:
            destination = .concierge
        case .connectEmail:
            destination = .email
        case .configureSafety:
            destination = .safety
        case .showUsage:
            destination = .usage
        }
    }
}

private struct AuthSheetToken: Identifiable {
    let id = UUID()
    let mode: AuthMode
}

private struct MessageRow: View {
    let message: LocalChatMessage
    let onAction: (RawUIAction) -> Void

    var body: some View {
        VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 10) {
            HStack {
                if message.role == .user { Spacer(minLength: 48) }

                Text(message.text)
                    .font(.body)
                    .foregroundStyle(NahwerkDesign.primaryText)
                    .textSelection(.enabled)
                    .padding(.horizontal, message.role == .user ? 14 : 0)
                    .padding(.vertical, message.role == .user ? 10 : 0)
                    .background(
                        message.role == .user ? NahwerkDesign.elevated : .clear,
                        in: RoundedRectangle(cornerRadius: 18)
                    )
                    .frame(maxWidth: 620, alignment: message.role == .user ? .trailing : .leading)

                if message.role != .user { Spacer(minLength: 48) }
            }

            if message.role == .assistant {
                ForEach(message.actions, id: \.stableID) { action in
                    if action.allowedType != nil {
                        Button(action.label?.isEmpty == false ? action.label! : "Weiter") {
                            onAction(action)
                        }
                        .buttonStyle(.bordered)
                        .tint(NahwerkDesign.gold)
                        .frame(minHeight: NahwerkDesign.touchHeight)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
    }
}

private struct AccountRequiredView: View {
    let destination: CustomerDestination
    let onLogin: () -> Void
    let onRegister: () -> Void

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                Text(destination.title)
                    .font(.largeTitle.weight(.semibold))
                Text(destination.guestMessage)
                    .foregroundStyle(NahwerkDesign.secondaryText)
                Button("Anmelden", action: onLogin)
                    .buttonStyle(.borderedProminent)
                    .tint(NahwerkDesign.gold)
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: NahwerkDesign.primaryTouchHeight)
                Button("Kostenlos registrieren", action: onRegister)
                    .buttonStyle(.bordered)
                    .tint(NahwerkDesign.gold)
                    .frame(maxWidth: .infinity, minHeight: NahwerkDesign.touchHeight)
                Spacer()
            }
            .padding(24)
            .background(NahwerkDesign.background.ignoresSafeArea())
            .preferredColorScheme(.dark)
        }
    }
}

private struct ProtectedFeatureView: View {
    let destination: CustomerDestination
    let token: String

    var body: some View {
        CustomerAreaContent(
            kind: destination.rawValue,
            title: destination.title,
            token: token
        )
    }
}

private struct AuthView: View {
    let initialMode: AuthMode
    @ObservedObject var session: SessionStore
    let onAuthenticated: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var mode: AuthMode

    @State private var email = ""
    @State private var password = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var verificationCode = ""
    @State private var registrationRequestID: String?

    @State private var code = ""
    @State private var busy = false
    @State private var error: String?

    init(initialMode: AuthMode, session: SessionStore, onAuthenticated: @escaping () -> Void) {
        self.initialMode = initialMode
        self.session = session
        self.onAuthenticated = onAuthenticated
        _mode = State(initialValue: initialMode)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("NAHWERK")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(NahwerkDesign.gold)

                    Picker("Konto", selection: $mode) {
                        Text("Anmelden").tag(AuthMode.login)
                        Text("Registrieren").tag(AuthMode.register)
                    }
                    .pickerStyle(.segmented)

                    if let pending = session.state.pendingMFA {
                        mfaForm(pending)
                    } else if mode == .login {
                        loginForm
                    } else {
                        registrationForm
                    }

                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(NahwerkDesign.error)
                    }
                }
                .padding(24)
            }
            .background(NahwerkDesign.background.ignoresSafeArea())
            .navigationTitle(mode == .login ? "Anmelden" : "Kostenlos registrieren")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Schließen") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var loginForm: some View {
        VStack(spacing: 14) {
            textField("E-Mail", text: $email, contentType: .emailAddress)
            SecureField("Passwort", text: $password)
                .textContentType(.password)
                .padding(14)
                .background(NahwerkDesign.surface, in: RoundedRectangle(cornerRadius: 16))

            Button {
                Task { await login() }
            } label: {
                busy ? AnyView(ProgressView()) : AnyView(Text("Anmelden"))
            }
            .buttonStyle(.borderedProminent)
            .tint(NahwerkDesign.gold)
            .foregroundStyle(.black)
            .disabled(busy || email.isEmpty || password.isEmpty)
            .frame(maxWidth: .infinity, minHeight: NahwerkDesign.primaryTouchHeight)
            .accessibilityIdentifier("customer_login")
        }
    }

    private var registrationForm: some View {
        VStack(spacing: 14) {
            textField("Vorname", text: $firstName, contentType: .givenName)
            textField("Nachname", text: $lastName, contentType: .familyName)
            textField("E-Mail", text: $email, contentType: .emailAddress)
            textField("Telefon", text: $phone, contentType: .telephoneNumber)
            SecureField("Passwort · mindestens 15 Zeichen", text: $password)
                .textContentType(.newPassword)
                .padding(14)
                .background(NahwerkDesign.surface, in: RoundedRectangle(cornerRadius: 16))

            if let requestID = registrationRequestID {
                textField("6-stelliger Bestätigungscode", text: $verificationCode, contentType: .oneTimeCode)
                Button("Bestätigen") {
                    Task { await verifyRegistration(requestID: requestID) }
                }
                .buttonStyle(.borderedProminent)
                .tint(NahwerkDesign.gold)
                .foregroundStyle(.black)
                .disabled(busy || verificationCode.filter(\.isNumber).count != 6)
                .frame(maxWidth: .infinity, minHeight: NahwerkDesign.primaryTouchHeight)
            } else {
                Button("Kostenlos registrieren") {
                    Task { await register() }
                }
                .buttonStyle(.borderedProminent)
                .tint(NahwerkDesign.gold)
                .foregroundStyle(.black)
                .disabled(
                    busy ||
                    firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                    lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                    email.isEmpty ||
                    phone.isEmpty ||
                    password.count < 15
                )
                .frame(maxWidth: .infinity, minHeight: NahwerkDesign.primaryTouchHeight)
            }
        }
    }

    private func mfaForm(_ pending: PendingMFA) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Sicherheitsbestätigung")
                .font(.title2.weight(.semibold))

            if pending.method == "choice" {
                Text("Wähle deine hinterlegte Bestätigungsmethode.")
                    .foregroundStyle(NahwerkDesign.secondaryText)
                ForEach(pending.methods, id: \.self) { method in
                    Button(method == "totp" ? "Authenticator" : method.uppercased()) {
                        Task { await beginMFA(method: method, pending: pending) }
                    }
                    .buttonStyle(.bordered)
                    .tint(NahwerkDesign.gold)
                    .frame(maxWidth: .infinity, minHeight: NahwerkDesign.touchHeight)
                }
            } else {
                if let masked = pending.maskedPhone, !masked.isEmpty {
                    Text("Code an \(masked)")
                        .foregroundStyle(NahwerkDesign.secondaryText)
                }
                textField("6-stelliger Code", text: $code, contentType: .oneTimeCode)
                Button("Bestätigen") {
                    Task { await verifyMFA(pending) }
                }
                .buttonStyle(.borderedProminent)
                .tint(NahwerkDesign.gold)
                .foregroundStyle(.black)
                .disabled(busy || code.filter(\.isNumber).count != 6)
                .frame(maxWidth: .infinity, minHeight: NahwerkDesign.primaryTouchHeight)
            }
        }
    }

    private func textField(_ title: String, text: Binding<String>, contentType: UITextContentType?) -> some View {
        TextField(title, text: text)
            .textContentType(contentType)
            .textInputAutocapitalization(contentType == .emailAddress ? .never : .words)
            .autocorrectionDisabled(contentType == .emailAddress)
            .padding(14)
            .background(NahwerkDesign.surface, in: RoundedRectangle(cornerRadius: 16))
    }

    private func login() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let response = try await NAHWERKAPI.production.login(email: email, password: password)
            session.apply(response)
            if session.isAuthenticated {
                onAuthenticated()
                dismiss()
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Anmeldung nicht möglich."
        }
    }

    private func beginMFA(method: String, pending: PendingMFA) async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let response = try await NAHWERKAPI.production.beginMFA(token: pending.token, method: method)
            session.updatePendingMFA(from: response)
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Sicherheitsbestätigung nicht möglich."
        }
    }

    private func verifyMFA(_ pending: PendingMFA) async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let response = try await NAHWERKAPI.production.verifyMFA(
                token: pending.token,
                method: pending.method,
                code: code,
                challengeID: pending.challengeID
            )
            session.apply(response)
            if session.isAuthenticated {
                onAuthenticated()
                dismiss()
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Code konnte nicht bestätigt werden."
        }
    }

    private func register() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let response = try await NAHWERKAPI.production.register(
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                password: password
            )
            guard response.ok == true else {
                throw NAHWERKAPIError.server(response.status ?? "registration_failed")
            }
            if let requestID = response.requestID, !requestID.isEmpty {
                registrationRequestID = requestID
            } else if response.status == "web_account_linked" {
                await login()
            } else {
                error = "Die Registrierung benötigt noch eine sichere Bestätigung."
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Registrierung nicht möglich."
        }
    }

    private func verifyRegistration(requestID: String) async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let response = try await NAHWERKAPI.production.verifyRegistration(
                requestID: requestID,
                verificationCode: verificationCode,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                password: password
            )
            guard response.ok == true, response.status == "web_account_linked" else {
                throw NAHWERKAPIError.server(response.status ?? "registration_failed")
            }
            await login()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Bestätigung nicht möglich."
        }
    }
}

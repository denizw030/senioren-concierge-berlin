import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var showLogin = false

    var body: some View {
        ZStack {
            NahwerkColors.background.ignoresSafeArea()
            if session.authenticated {
                CustomerShell()
            } else {
                GuestChatView(onLogin: { showLogin = true })
            }
        }
        .sheet(isPresented: $showLogin) {
            LoginView()
                .environmentObject(session)
                .presentationDetents([.large])
        }
    }
}

private struct BrandHeader: View {
    var title: String = "NAHWERK"
    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle().fill(NahwerkColors.goldSoft)
                Text("N").font(.headline.weight(.semibold)).foregroundStyle(NahwerkColors.gold)
            }
            .frame(width: 34, height: 34)
            Text(title)
                .font(.headline)
                .tracking(1.4)
                .foregroundStyle(NahwerkColors.gold)
            Spacer()
        }
    }
}

private struct MessageBubble: View {
    let text: String
    let isUser: Bool

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 44) }
            Text(text)
                .font(.body)
                .foregroundStyle(NahwerkColors.primary)
                .padding(.horizontal, 15)
                .padding(.vertical, 12)
                .background(isUser ? NahwerkColors.elevated : NahwerkColors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(NahwerkColors.divider, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            if !isUser { Spacer(minLength: 44) }
        }
    }
}

private struct ChatComposer: View {
    @Binding var text: String
    let busy: Bool
    let send: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Nachricht an NAHWERK", text: $text, axis: .vertical)
                .lineLimit(1...5)
                .textFieldStyle(.plain)
                .padding(13)
                .background(NahwerkColors.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            Button(action: send) {
                Image(systemName: busy ? "hourglass" : "arrow.up")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.black)
                    .frame(width: 44, height: 44)
                    .background(NahwerkColors.gold)
                    .clipShape(Circle())
            }
            .disabled(busy || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .opacity((busy || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) ? 0.45 : 1)
        }
    }
}

private struct GuestChatView: View {
    let onLogin: () -> Void
    @State private var draft = ""
    @State private var messages: [(Bool, String)] = []
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            BrandHeader()
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

            if messages.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Text("Wie kann ich dir helfen?")
                        .font(.system(size: 29, weight: .semibold))
                        .foregroundStyle(NahwerkColors.primary)
                    Text("Frag NAHWERK direkt. Für persönliche Daten und Ausführungen meldest du dich sicher an.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(NahwerkColors.secondary)
                        .padding(.horizontal, 28)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(Array(messages.enumerated()), id: \.offset) { _, item in
                            MessageBubble(text: item.1, isUser: item.0)
                        }
                    }
                    .padding(20)
                }
            }

            if let error {
                Text(error).font(.footnote).foregroundStyle(NahwerkColors.error).padding(.horizontal, 20)
            }

            VStack(spacing: 12) {
                ChatComposer(text: $draft, busy: busy, send: send)
                Button("Anmelden") { onLogin() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(NahwerkColors.gold)
            }
            .padding(20)
            .background(NahwerkColors.background)
        }
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !busy else { return }
        draft = ""
        messages.append((true, text))
        busy = true
        error = nil
        Task {
            do {
                let reply = try await NahwerkAPI.shared.guestChat(message: text)
                await MainActor.run {
                    messages.append((false, reply.text))
                    busy = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    busy = false
                }
            }
        }
    }
}

private struct LoginView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var code = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                NahwerkColors.background.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        BrandHeader(title: "NAHWERK")
                        Text(session.mfaRequired ? "Sicherheitsbestätigung" : "Anmelden")
                            .font(.largeTitle.weight(.semibold))
                            .foregroundStyle(NahwerkColors.primary)
                        if session.mfaRequired {
                            mfaView
                        } else {
                            loginForm
                        }
                        if let error {
                            Text(error).font(.footnote).foregroundStyle(NahwerkColors.error)
                        }
                    }
                    .padding(24)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Schließen") { dismiss() }.foregroundStyle(NahwerkColors.gold)
                }
            }
            .onChange(of: session.authenticated) { _, active in
                if active { dismiss() }
            }
        }
    }

    private var loginForm: some View {
        VStack(spacing: 14) {
            TextField("E-Mail", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .padding(14)
                .background(NahwerkColors.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            SecureField("Passwort", text: $password)
                .padding(14)
                .background(NahwerkColors.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            Button(busy ? "Wird angemeldet …" : "Anmelden") { login() }
                .buttonStyle(NahwerkPrimaryButtonStyle())
                .disabled(busy || email.isEmpty || password.isEmpty)
        }
        .nahwerkCard()
    }

    @ViewBuilder
    private var mfaView: some View {
        VStack(spacing: 14) {
            if session.pendingMfaMethod == "choice" {
                Text("Wähle deine hinterlegte Bestätigungsmethode.")
                    .foregroundStyle(NahwerkColors.secondary)
                ForEach(session.pendingMfaMethods, id: \.self) { method in
                    Button(method == "totp" ? "Authenticator" : method.uppercased()) {
                        startMFA(method)
                    }
                    .buttonStyle(NahwerkPrimaryButtonStyle())
                }
            } else {
                if let phone = session.maskedPhone {
                    Text("Code an \(phone)").foregroundStyle(NahwerkColors.secondary)
                }
                TextField("6-stelliger Code", text: $code)
                    .keyboardType(.numberPad)
                    .padding(14)
                    .background(NahwerkColors.elevated)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .onChange(of: code) { _, newValue in
                        code = String(newValue.filter(\.isNumber).prefix(6))
                    }
                Button(busy ? "Wird geprüft …" : "Bestätigen") { verifyMFA() }
                    .buttonStyle(NahwerkPrimaryButtonStyle())
                    .disabled(busy || code.count != 6)
            }
        }
        .nahwerkCard()
    }

    private func login() {
        busy = true; error = nil
        Task {
            do {
                _ = try await NahwerkAPI.shared.login(email: email, password: password, store: session)
                await MainActor.run { busy = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; busy = false }
            }
        }
    }

    private func startMFA(_ method: String) {
        busy = true; error = nil
        Task {
            do {
                _ = try await NahwerkAPI.shared.beginMFA(method: method, store: session)
                await MainActor.run { busy = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; busy = false }
            }
        }
    }

    private func verifyMFA() {
        busy = true; error = nil
        Task {
            do {
                _ = try await NahwerkAPI.shared.verifyMFA(code: code, store: session)
                await MainActor.run { busy = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; busy = false }
            }
        }
    }
}

private struct CustomerShell: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        TabView {
            CustomerHomeView()
                .tabItem { Label("Übersicht", systemImage: "house.fill") }
            CustomerChatView()
                .tabItem { Label("Concierge", systemImage: "bubble.left.and.bubble.right.fill") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle.fill") }
        }
        .tint(NahwerkColors.gold)
    }
}

private struct CustomerHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var summary = "Wird geladen …"
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                NahwerkColors.background.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 18) {
                    BrandHeader()
                    Text("Übersicht").font(.largeTitle.weight(.semibold)).foregroundStyle(NahwerkColors.primary)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Persönlicher Concierge").font(.headline)
                        Text(summary).foregroundStyle(NahwerkColors.secondary)
                    }
                    .nahwerkCard()
                    if let error { Text(error).font(.footnote).foregroundStyle(NahwerkColors.error) }
                    Spacer()
                }
                .padding(20)
            }
            .task { await load() }
        }
    }

    private func load() async {
        do {
            let json = try await NahwerkAPI.shared.loadHome(store: session)
            let reminders = json["reminder_count_active"] as? Int ?? 0
            let persona = (json["persona"] as? [String: Any])?["display_name"] as? String
                ?? (json["persona"] as? [String: Any])?["name"] as? String
                ?? "NAHWERK Concierge"
            await MainActor.run {
                summary = "\(persona) · \(reminders) aktive Erinnerung\(reminders == 1 ? "" : "en")"
                error = nil
            }
        } catch {
            await MainActor.run { self.error = error.localizedDescription; summary = "Nicht verfügbar" }
        }
    }
}

private struct CustomerChatView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var draft = ""
    @State private var messages: [(Bool, String)] = []
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                NahwerkColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    if messages.isEmpty {
                        Spacer()
                        Text("Wie kann ich dir helfen?")
                            .font(.title.weight(.semibold))
                            .foregroundStyle(NahwerkColors.primary)
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(Array(messages.enumerated()), id: \.offset) { _, item in
                                    MessageBubble(text: item.1, isUser: item.0)
                                }
                            }.padding(20)
                        }
                    }
                    if let error { Text(error).font(.footnote).foregroundStyle(NahwerkColors.error) }
                    ChatComposer(text: $draft, busy: busy, send: send).padding(20)
                }
            }
            .navigationTitle("Concierge")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !busy else { return }
        draft = ""; messages.append((true, text)); busy = true; error = nil
        Task {
            do {
                let reply = try await NahwerkAPI.shared.chat(message: text, store: session)
                await MainActor.run { messages.append((false, reply.text)); busy = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; busy = false }
            }
        }
    }
}

private struct AccountView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        NavigationStack {
            ZStack {
                NahwerkColors.background.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 20) {
                    BrandHeader()
                    Text("Account").font(.largeTitle.weight(.semibold)).foregroundStyle(NahwerkColors.primary)
                    Text("Deine Kontodaten, Nutzung, Safety und E-Mail bleiben serverseitig in der zentralen NAHWERK Authority.")
                        .foregroundStyle(NahwerkColors.secondary)
                        .nahwerkCard()
                    Button("Abmelden") { session.clear() }
                        .foregroundStyle(NahwerkColors.error)
                    Spacer()
                }
                .padding(20)
            }
        }
    }
}

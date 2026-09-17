import SwiftUI

struct CustomerAreaRow: Identifiable, Equatable {
    let id = UUID()
    let label: String
    let value: String
}

@MainActor
final class CustomerAreaViewModel: ObservableObject {
    @Published private(set) var heading = ""
    @Published private(set) var subtitle = ""
    @Published private(set) var rows: [CustomerAreaRow] = []
    @Published private(set) var loading = false
    @Published private(set) var error: String?

    private let api: NAHWERKAPI

    init(api: NAHWERKAPI = .production) {
        self.api = api
    }

    func load(kind: String, token: String) async {
        guard !loading else { return }
        loading = true
        error = nil
        defer { loading = false }

        do {
            switch kind {
            case "concierge":
                let response = try await api.loadMe(token: token)
                guard response.environment == "PROD", response.authoritative != false else {
                    throw NAHWERKAPIError.invalidResponse
                }
                heading = "Dein Concierge"
                subtitle = "Deine zentrale Auswahl gilt für deine verbundenen NAHWERK-Kanäle."
                rows = [
                    CustomerAreaRow(
                        label: "Concierge",
                        value: response.persona?.customerName ?? "NAHWERK Concierge"
                    )
                ]

            case "usage":
                let response = try await api.loadCustomerProfile(token: token)
                heading = "Deine Nutzung"
                subtitle = "Die Werte kommen direkt aus deinem NAHWERK-Konto."
                rows = usageRows(profile: response)

            case "personalData":
                let response = try await api.loadCustomerProfile(token: token)
                heading = "Persönliche Daten"
                subtitle = "Deine hinterlegten Kontodaten."
                let name = [response.profile?.firstName, response.profile?.lastName]
                    .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                    .joined(separator: " ")
                rows = [
                    CustomerAreaRow(label: "Name", value: name.isEmpty ? "Nicht hinterlegt" : name),
                    CustomerAreaRow(label: "E-Mail", value: response.profile?.email ?? "Nicht hinterlegt"),
                    CustomerAreaRow(label: "WhatsApp", value: response.profile?.whatsappNumber ?? "Nicht hinterlegt"),
                    CustomerAreaRow(label: "Kundennummer", value: response.customerNumber ?? "Nicht verfügbar")
                ]

            case "safety":
                let response = try await api.loadSafety(token: token)
                heading = "Safety"
                let safety = response.safety
                subtitle = safety?.enabled == true
                    ? "Safety ist für dein Konto aktiviert."
                    : "Safety ist für dein Konto derzeit nicht aktiviert."
                rows = [
                    CustomerAreaRow(label: "Status", value: safety?.enabled == true ? "Aktiv" : "Nicht aktiv"),
                    CustomerAreaRow(
                        label: "Zeiten",
                        value: (safety?.checkinTimes ?? []).isEmpty
                            ? "Keine Zeiten"
                            : (safety?.checkinTimes ?? []).joined(separator: " · ")
                    ),
                    CustomerAreaRow(
                        label: "Sicherheitskontakte",
                        value: String(safety?.contacts?.count ?? 0)
                    )
                ]

            case "email":
                let accountsResponse = try await api.loadEmailAccounts(token: token)
                let accounts = accountsResponse.accounts ?? []
                let connected = accounts.filter(\.isConnected)
                heading = "E-Mail"
                subtitle = connected.isEmpty
                    ? "Noch kein E-Mail-Konto verbunden."
                    : connected.count == 1
                        ? "1 E-Mail-Konto ist verbunden."
                        : "\(connected.count) E-Mail-Konten sind verbunden."
                rows = connected.map {
                    CustomerAreaRow(
                        label: $0.providerLabel ?? $0.provider ?? "E-Mail",
                        value: $0.accountDisplayHint ?? "Verbunden"
                    )
                }

                if !connected.isEmpty,
                   let dashboard = try? await api.loadEmailDashboard(token: token),
                   let summary = dashboard.summary {
                    rows.append(CustomerAreaRow(label: "Ungelesen", value: String(summary.unread ?? 0)))
                    rows.append(CustomerAreaRow(label: "Wichtig", value: String(summary.important ?? 0)))
                    rows.append(CustomerAreaRow(label: "Antwort empfohlen", value: String(summary.needsReply ?? 0)))
                }

            default:
                throw NAHWERKAPIError.invalidResponse
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription
                ?? "Dieser Bereich konnte gerade nicht geladen werden."
        }
    }

    private func usageRows(profile: CustomerProfileResponse) -> [CustomerAreaRow] {
        let plan = profile.plan
        let usage = profile.usage

        let appValue: String
        if let limit = plan?.appDialogueLimit {
            appValue = "\(usage?.appDialoguesUsed ?? 0) von \(limit)"
        } else {
            appValue = "Unbegrenzt"
        }

        let whatsappValue: String
        if let limit = plan?.whatsappDialogueLimit {
            whatsappValue = "\(usage?.whatsappDialoguesUsed ?? 0) von \(limit)"
        } else {
            whatsappValue = "Unbegrenzt"
        }

        return [
            CustomerAreaRow(label: "Tarif", value: plan?.name ?? plan?.code ?? "Nicht verfügbar"),
            CustomerAreaRow(label: "App", value: appValue),
            CustomerAreaRow(label: "WhatsApp", value: whatsappValue)
        ]
    }
}

struct CustomerAreaContent: View {
    let kind: String
    let title: String
    let token: String

    @StateObject private var model = CustomerAreaViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    if model.loading && model.rows.isEmpty {
                        ProgressView()
                            .tint(NahwerkDesign.gold)
                            .frame(maxWidth: .infinity, minHeight: 120)
                            .accessibilityLabel("Wird geladen")
                    } else {
                        Text(model.heading.isEmpty ? title : model.heading)
                            .font(.largeTitle.weight(.semibold))
                            .foregroundStyle(NahwerkDesign.primaryText)

                        if !model.subtitle.isEmpty {
                            Text(model.subtitle)
                                .font(.body)
                                .foregroundStyle(NahwerkDesign.secondaryText)
                        }

                        if let error = model.error {
                            Text(error)
                                .font(.body)
                                .foregroundStyle(NahwerkDesign.error)
                                .accessibilityIdentifier("customer_area_error")
                        }

                        if model.rows.isEmpty && model.error == nil && !model.loading {
                            Text("Für diesen Bereich sind aktuell keine Daten vorhanden.")
                                .foregroundStyle(NahwerkDesign.secondaryText)
                        } else if !model.rows.isEmpty {
                            VStack(spacing: 0) {
                                ForEach(Array(model.rows.enumerated()), id: \.element.id) { index, row in
                                    HStack(alignment: .firstTextBaseline, spacing: 16) {
                                        Text(row.label)
                                            .foregroundStyle(NahwerkDesign.secondaryText)

                                        Spacer(minLength: 20)

                                        Text(row.value)
                                            .foregroundStyle(NahwerkDesign.primaryText)
                                            .multilineTextAlignment(.trailing)
                                    }
                                    .font(.body)
                                    .padding(.vertical, 16)
                                    .frame(minHeight: NahwerkDesign.touchHeight)

                                    if index < model.rows.count - 1 {
                                        Divider().overlay(NahwerkDesign.divider)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .background(
                                NahwerkDesign.surface,
                                in: RoundedRectangle(cornerRadius: NahwerkDesign.cardRadius)
                            )
                        }
                    }
                }
                .padding(24)
            }
            .background(NahwerkDesign.background.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .task(id: "\(kind):\(token)") {
                await model.load(kind: kind, token: token)
            }
        }
        .preferredColorScheme(.dark)
    }
}

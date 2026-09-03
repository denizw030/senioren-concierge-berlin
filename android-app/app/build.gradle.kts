val releaseAuthBaseUrl = System.getenv("NAHWERK_RELEASE_AUTH_BASE_URL")?.trim().orEmpty()
val releaseGatewayBaseUrl = System.getenv("NAHWERK_RELEASE_GATEWAY_BASE_URL")?.trim().orEmpty()
val releaseKeystorePath = System.getenv("NAHWERK_ANDROID_KEYSTORE_PATH")?.trim().orEmpty()
val releaseStorePassword = System.getenv("NAHWERK_ANDROID_STORE_PASSWORD")?.trim().orEmpty()
val releaseKeyAlias = System.getenv("NAHWERK_ANDROID_KEY_ALIAS")?.trim().orEmpty()
val releaseKeyPassword = System.getenv("NAHWERK_ANDROID_KEY_PASSWORD")?.trim().orEmpty()

val releaseSigningValues = listOf(
    releaseKeystorePath,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword
)
val releaseSigningAny = releaseSigningValues.any { it.isNotBlank() }
val releaseSigningComplete = releaseSigningValues.all { it.isNotBlank() }

require(!releaseSigningAny || releaseSigningComplete) {
    "Android release signing requires all four NAHWERK_ANDROID_* signing environment variables."
}

fun buildConfigString(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.nahwerk.concierge"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.nahwerk.concierge"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1-staging"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true; buildConfig = true }

    signingConfigs {
        if (releaseSigningComplete) {
            create("releaseFromEnvironment") {
                storeFile = file(releaseKeystorePath)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }
    buildTypes {
        debug {
            buildConfigField("String", "AUTH_BASE_URL", "\"https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-mobile-auth-staging\"")
            buildConfigField("String", "GATEWAY_BASE_URL", "\"https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-mobile-gateway-staging\"")
        }
        release {
            isMinifyEnabled = true
            buildConfigField("String", "AUTH_BASE_URL", buildConfigString(releaseAuthBaseUrl))
            buildConfigField("String", "GATEWAY_BASE_URL", buildConfigString(releaseGatewayBaseUrl))
            if (releaseSigningComplete) {
                signingConfig = signingConfigs.getByName("releaseFromEnvironment")
            }
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}

val releaseKeystorePath = System.getenv("NAHWERK_ANDROID_KEYSTORE_PATH")?.trim().orEmpty()
val releaseStorePassword = System.getenv("NAHWERK_ANDROID_STORE_PASSWORD")?.trim().orEmpty()
val releaseKeyAlias = System.getenv("NAHWERK_ANDROID_KEY_ALIAS")?.trim().orEmpty()
val releaseKeyPassword = System.getenv("NAHWERK_ANDROID_KEY_PASSWORD")?.trim().orEmpty()
val customerProductBaseUrl = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1"

val releaseSigningValues = listOf(
    releaseKeystorePath,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword
)
val releaseSigningAny = releaseSigningValues.any { it.isNotBlank() }
val releaseSigningComplete = releaseSigningValues.all { it.isNotBlank() }

fun isStagingEndpoint(value: String): Boolean =
    value.contains("staging", ignoreCase = true) || value.contains("-stg", ignoreCase = true)

require(!releaseSigningAny || releaseSigningComplete) {
    "Android release signing requires all four NAHWERK_ANDROID_* signing environment variables."
}
require(customerProductBaseUrl.startsWith("https://") && !isStagingEndpoint(customerProductBaseUrl)) {
    "Android customer product API must target canonical HTTPS PROD only."
}
require(customerProductBaseUrl.contains("djicahhmnnamtjuqedqd.supabase.co")) {
    "Android customer product API must target the canonical NAHWERK PROD project."
}

fun buildConfigString(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val splashAssetPartsDir = layout.projectDirectory.dir("src/main/splash-reference")
val generatedSplashResDir = layout.buildDirectory.dir("generated/nahwerkSplashRes")
val splashAssetSha256 = "40d81ef0f53c31a48cc9ca2ec2ca8dfca2ead41c897aa0c1a673ddac43a980a3"

val prepareNahwerkSplashAsset = tasks.register("prepareNahwerkSplashAsset") {
    val parts = fileTree(splashAssetPartsDir) {
        include("nahwerk_brand_coin.b64.part*")
    }
    inputs.files(parts)
    outputs.file(generatedSplashResDir.map { it.file("drawable-nodpi/nahwerk_brand_coin.webp") })

    doLast {
        val orderedParts = parts.files.sortedBy { it.name }
        check(orderedParts.size == 6) {
            "NAHWERK splash asset requires exactly 6 canonical reference chunks."
        }
        val encoded = orderedParts.joinToString(separator = "") { it.readText().trim() }
        val bytes = java.util.Base64.getDecoder().decode(encoded)
        val digest = java.security.MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString(separator = "") { "%02x".format(it.toInt() and 0xff) }
        check(digest == splashAssetSha256) {
            "NAHWERK splash reference checksum mismatch: $digest"
        }
        val output = generatedSplashResDir.get().file("drawable-nodpi/nahwerk_brand_coin.webp").asFile
        output.parentFile.mkdirs()
        output.writeBytes(bytes)
    }
}

android {
    namespace = "com.nahwerk.concierge"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.nahwerk.concierge"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "0.2.2"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "CUSTOMER_PRODUCT_BASE_URL", buildConfigString(customerProductBaseUrl))
    }
    buildFeatures { compose = true; buildConfig = true }
    sourceSets.getByName("main").res.srcDir(generatedSplashResDir)

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
            versionNameSuffix = "-dev"
            buildConfigField("String", "APP_ENVIRONMENT", "\"LOCAL\"")
            buildConfigField("String", "AUTH_BASE_URL", "\"\"")
            buildConfigField("String", "GATEWAY_BASE_URL", "\"\"")
        }
        release {
            isMinifyEnabled = true
            buildConfigField("String", "APP_ENVIRONMENT", "\"PROD\"")
            // Legacy mobile transport is intentionally inert. Customer PROD traffic
            // uses CUSTOMER_PRODUCT_BASE_URL + /nahwerk-app-gateway.
            buildConfigField("String", "AUTH_BASE_URL", "\"\"")
            buildConfigField("String", "GATEWAY_BASE_URL", "\"\"")
            if (releaseSigningComplete) {
                signingConfig = signingConfigs.getByName("releaseFromEnvironment")
            }
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

tasks.named("preBuild").configure {
    dependsOn(prepareNahwerkSplashAsset)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    compileOnly("com.google.errorprone:error_prone_annotations:2.36.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}

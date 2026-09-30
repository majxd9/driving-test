import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// ─────────────────────────────────────────────────────────────────
//  إعدادات «رخصتي» — هذا هو المكان الوحيد الذي تحتاج تعدّل فيه
// ─────────────────────────────────────────────────────────────────

// رابط الموقع الذي يعرضه التطبيق
val siteUrl = "https://driving-test-7en.pages.dev/"

// النطاقات التي تُفتح داخل التطبيق (أي رابط خارجها يُفتح في المتصفح). افصل بينها بفاصلة.
val internalHosts = "driving-test-7en.pages.dev"

// true = منع لقطة الشاشة وتسجيل الشاشة (FLAG_SECURE).
// غيّرها إلى false فقط إذا أردت تصوير التطبيق مؤقتاً.
val blockScreenshots = true

// ─────────────────────────────────────────────────────────────────
//  توقيع نسخة release (اختياري). إذا وُجد الملف android/keystore.properties
//  يُستخدم مفتاحك الدائم، وإلا يُوقَّع بمفتاح تجريبي (يكفي للتجربة).
// ─────────────────────────────────────────────────────────────────
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val hasReleaseKeystore = keystoreProps.getProperty("storeFile") != null

android {
    namespace = "com.rukhsati.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.rukhsati.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "SITE_URL", "\"$siteUrl\"")
        buildConfigField("String", "INTERNAL_HOSTS", "\"$internalHosts\"")
        buildConfigField("boolean", "BLOCK_SCREENSHOTS", "$blockScreenshots")
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    lint {
        abortOnError = false
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.ktx)
}

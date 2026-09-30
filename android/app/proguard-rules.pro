# رخصتي is a thin WebView shell: no reflection and no JavaScript bridge,
# so the default R8 rules are enough. Add rules here only if you later add a
# @JavascriptInterface (keep the annotated methods).

# Keep readable stack traces for crash reports.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

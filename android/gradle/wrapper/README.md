# Gradle wrapper

`gradle-wrapper.properties` is committed, but the binary `gradle-wrapper.jar` and the `gradlew` /
`gradlew.bat` launcher scripts are **not** (this repo was authored without a JDK in the loop).

Generate them once — any of these works, all use the pinned 8.10.2 above:

```bash
cd android && gradle wrapper --gradle-version 8.10.2
# or: open the android/ folder in Android Studio once and let it sync
```

Then `./gradlew :app:assembleDebug` from `android/` will run.

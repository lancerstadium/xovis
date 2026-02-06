# xovis Mobile (Capacitor)

移动端应用配置，支持 Android (.apk) 和 iOS (.ipa)。

## 前置要求

### Android
- Android Studio
- JDK 17+
- Android SDK

### iOS
- macOS
- Xcode 14+
- CocoaPods

## 安装

```bash
cd packages/web
pnpm install
pnpm add @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init
```

## 构建

```bash
# 1. 构建 web 应用
cd packages/web
pnpm build

# 2. 同步到原生项目
npx cap sync

# 3. Android - 生成 APK
npx cap open android
# 在 Android Studio 中: Build > Build Bundle(s) / APK(s) > Build APK(s)

# 4. iOS - 生成 IPA
npx cap open ios
# 在 Xcode 中: Product > Archive
```

## 开发

```bash
# 启动开发服务器
cd packages/web
pnpm dev

# 在另一个终端同步
npx cap run android
# 或
npx cap run ios
```

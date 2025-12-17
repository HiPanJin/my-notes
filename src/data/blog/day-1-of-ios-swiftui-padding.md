---
title: "Day 1 of iOS (SwiftUI): Project Structure and What Padding Really Means"
author: Jin Pan
pubDatetime: 2025-12-17T00:00:00Z
slug: day-1-of-ios-swiftui-padding
featured: false
draft: false
tags:
  - iOS
  - SwiftUI
  - Learning
  - Beginner
description: "My first day learning iOS. I created a SwiftUI project and finally understood what padding does."
---

## What I Did Today

- Created a new SwiftUI project in Xcode.
- Learned where the app starts.
- Built a simple screen with `VStack`, `Image`, and `Text`.
- Got confused about `.padding()`, then finally understood it.

## SwiftUI Project Structure (The Basic Idea)

A SwiftUI app usually starts in a file like `MyApp.swift`:

```swift
@main
struct WeSplitApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

What this means:

- `@main` marks the entry point of the app.
- `WindowGroup` creates the main window.
- `ContentView()` is the first screen shown.

## What Is `ContentView`?

`ContentView` is a SwiftUI view:

```swift
struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "gearshape")
            Text("Hello, world!")
        }
    }
}
```

`body` describes the UI. SwiftUI reads `body` and draws the screen.

## The Main Confusion: What Does `.padding()` Do?

At first, padding looked like "making things bigger," but the real meaning is:

- `.padding(x)` adds empty space around a view.
- It expands the view's layout area inside its parent.
- It does not scale the content itself.

Think of it this way:

- New width = original width + 2x
- New height = original height + 2x

### Why Did It Look Like the Content Got Bigger?

I wrote code like this:

```swift
VStack {
    // content
}
.padding(50)
.border(.red)
```

The border is drawn after padding, so it includes the padding area. The red border gets larger, which makes it feel like the whole view grew.

### The Key Trick: Order Matters

**1) Padding first, then border**

```swift
.padding(50)
.border(.red)
```

- The border includes the padding.

**2) Border first, then padding**

```swift
.border(.red)
.padding(50)
```

- The border hugs the original content; padding sits outside it.

This simple ordering difference is the easiest way to understand what padding really does.

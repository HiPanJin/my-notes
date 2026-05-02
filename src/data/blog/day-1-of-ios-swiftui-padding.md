---
title: "iOS + SwiftUI Notes"
author: Jin Pan
pubDatetime: 2025-12-17T00:00:00Z
modDatetime: 2026-05-01T00:00:00Z
featured: false
draft: false
tags:
  - iOS
  - SwiftUI
  - Notes
description: "Small SwiftUI notes, confusions, and fixes as I learn iOS."
---

This page is my iOS and SwiftUI notebook. New ideas go here as dated notes,
not as separate posts.

## 2026-05-01

I like the idea of one topic having one page. SwiftUI is full of tiny
realizations. Most of them do not need a whole article.

A useful note can be as small as:

- the thing that confused me
- the code shape that explained it
- the sentence I want to remember next time

## 2025-12-17

### What I Did

- Created a new SwiftUI project in Xcode.
- Learned where the app starts.
- Built a simple screen with `VStack`, `Image`, and `Text`.
- Got confused about `.padding()`, then finally understood it.

### SwiftUI Project Structure

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

### What Is `ContentView`?

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

### What Does `.padding()` Do?

At first, padding looked like "making things bigger," but the real meaning is:

- `.padding(x)` adds empty space around a view.
- It expands the view's layout area inside its parent.
- It does not scale the content itself.

Think of it this way:

- New width = original width + 2x
- New height = original height + 2x

#### Why Did It Look Like the Content Got Bigger?

I wrote code like this:

```swift
VStack {
    // content
}
.padding(50)
.border(.red)
```

The border is drawn after padding, so it includes the padding area. The red border gets larger, which makes it feel like the whole view grew.

#### The Key Trick: Order Matters

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

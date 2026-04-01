# Chinese Stroop

A **Stroop-style** task in the browser: you see an **English color word** drawn in some **ink color** (and sometimes a small **gold or silver bar** next to the word when the ink is metallic). You tap the matching option in **simplified Chinese** (简体中文).

## How to play

1. **Optional:** enter a **display name** on the home screen (used on the leaderboard; saved in this browser).
2. Pick a **level** (see below). Each run is **24 trials**; every trial gives **five** Chinese choices, one correct.
3. Answer **before the per-trial timer** runs out (**15 seconds**). If time runs out, the trial counts as wrong and the correct button is highlighted.
4. After the run you see a short **summary** (accuracy, mean reaction time on correct trials, total run time). You can play the same level again or return to the menu.
5. Open **Leaderboard** from the nav to see ranked runs by level (**name**, **accuracy**, **time** to finish the 24 trials). Rankings favor higher accuracy, then faster time.

## Levels

| Level | What you match | Pinyin on buttons? |
| ----- | -------------- | ---------------- |
| **1** | Ink matches the word (e.g. “Red” in red). Tap the Chinese for **that color word**. | Yes |
| **2** | Classic Stroop: ink can **differ** from the word (e.g. “Red” in green). Tap the Chinese for the **ink** color. | Yes |
| **3** | Same as level 2, but **no pinyin** on the buttons. | No |

**Gold** and **silver** ink use a **vertical swatch** beside the word so they are easy to tell apart from yellow and white.

## Colors

Twelve colors appear in the pool (red, green, yellow, blue, purple, orange, brown, black, white, gray, gold, silver), each with a fixed simplified Chinese label.

## Stats

Session history and lifetime aggregates for **your device** are kept in **localStorage** under the `chineseStroop_` prefix. Leaderboard rows may also be stored in the cloud when the site is configured for it.

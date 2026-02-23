package com.example.jbmarks.shared.domain.tasks

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

actual object PlatformClock {
    actual fun now(): Instant = Clock.System.now()
}

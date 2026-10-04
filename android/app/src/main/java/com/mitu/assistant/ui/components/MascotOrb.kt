package com.mitu.assistant.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.mitu.assistant.domain.models.AssistantState
import kotlinx.coroutines.delay

/**
 * MascotOrb: Original vector character "Mitu" drawn natively in Jetpack Compose Canvas.
 * Supports: Breathing idle, eye blinks, listening ripple rings, thinking floating dots,
 * speaking mouth animation, dizzy spiral eyes, and touch response.
 */
@Composable
fun MascotOrb(
    state: AssistantState,
    modifier: Modifier = Modifier,
    size: Dp = 160.dp,
    audioAmplitude: Float = 0f,
    onClick: () -> Unit = {}
) {
    var tapCount by remember { mutableIntStateOf(0) }
    var dizzyFromTap by remember { mutableStateOf(false) }

    // A tap burst makes Mitu dizzy for 2.5s and then recovers; without the reset the mascot was
    // stuck with cross eyes after the third tap for the rest of the session.
    LaunchedEffect(tapCount) {
        if (tapCount >= 3) {
            dizzyFromTap = true
            delay(2500)
            dizzyFromTap = false
            tapCount = 0
        }
    }

    val isDizzy = dizzyFromTap || state == AssistantState.DIZZY

    val infiniteTransition = rememberInfiniteTransition(label = "mascot_infinite")

    // Gentle breathing scale
    val breathScale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breath"
    )

    // Periodic blinking (1.0 = open, 0.05 = closed). Animating 1f -> 1f meant Mitu never blinked.
    val blinkProgress = remember { Animatable(1f) }
    LaunchedEffect(blinkProgress) {
        while (true) {
            delay((3500L..6000L).random())
            blinkProgress.animateTo(0.05f, tween(90))
            blinkProgress.animateTo(1f, tween(130))
        }
    }

    // Ripple expansion for listening
    val rippleScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ripple"
    )

    // Palette
    val lavenderPrimary = Color(0xFF9B8CFF)
    val lavenderLight = Color(0xFFECE9FF)
    val peachBlush = Color(0xFFFFB5A7)
    val sunshineColor = Color(0xFFFFD966)
    val inkEyeColor = Color(0xFF2B2540)
    val coralError = Color(0xFFFF7A7A)

    Box(
        modifier = modifier
            .size(size)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                tapCount++
                onClick()
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val canvasW = this.size.width
            val canvasH = this.size.height
            val center = Offset(canvasW / 2f, canvasH / 2f)
            val orbRadius = canvasW * 0.40f * if (state == AssistantState.STANDBY) breathScale else (1f + audioAmplitude * 0.15f)

            // 1. Draw listening acoustic ripples
            if (state == AssistantState.LISTENING) {
                drawCircle(
                    color = lavenderPrimary.copy(alpha = 0.25f * (1.35f - rippleScale)),
                    radius = orbRadius * rippleScale * (1f + audioAmplitude * 0.3f),
                    center = center,
                    style = Stroke(width = 6f)
                )
            }

            // 2. Draw Ears / Sprout
            val earRadius = orbRadius * 0.22f
            drawCircle(
                color = lavenderPrimary,
                radius = earRadius,
                center = Offset(center.x - orbRadius * 0.65f, center.y - orbRadius * 0.70f)
            )
            drawCircle(
                color = lavenderPrimary,
                radius = earRadius,
                center = Offset(center.x + orbRadius * 0.65f, center.y - orbRadius * 0.70f)
            )

            // 3. Body: Soft squircle blob
            val bodyColor = if (state == AssistantState.ERROR) coralError else lavenderPrimary
            val bodyGradient = Brush.verticalGradient(
                colors = listOf(bodyColor, bodyColor.copy(alpha = 0.90f))
            )
            drawRoundRect(
                brush = bodyGradient,
                topLeft = Offset(center.x - orbRadius, center.y - orbRadius),
                size = Size(orbRadius * 2, orbRadius * 2),
                cornerRadius = CornerRadius(orbRadius * 0.85f, orbRadius * 0.85f)
            )

            // Lighter belly patch
            drawRoundRect(
                color = lavenderLight.copy(alpha = 0.40f),
                topLeft = Offset(center.x - orbRadius * 0.65f, center.y - orbRadius * 0.20f),
                size = Size(orbRadius * 1.3f, orbRadius * 1.0f),
                cornerRadius = CornerRadius(orbRadius * 0.60f, orbRadius * 0.60f)
            )

            // 4. Cheeks (Peach blush)
            drawCircle(
                color = peachBlush.copy(alpha = 0.75f),
                radius = orbRadius * 0.16f,
                center = Offset(center.x - orbRadius * 0.52f, center.y + orbRadius * 0.18f)
            )
            drawCircle(
                color = peachBlush.copy(alpha = 0.75f),
                radius = orbRadius * 0.16f,
                center = Offset(center.x + orbRadius * 0.52f, center.y + orbRadius * 0.18f)
            )

            // 5. Eyes
            val eyeOffsetY = if (state == AssistantState.THINKING) -orbRadius * 0.25f else 0f
            val eyeHeight = (orbRadius * 0.22f) * if (isDizzy) 0.8f else blinkProgress.value
            val leftEyeCenter = Offset(center.x - orbRadius * 0.32f, center.y - orbRadius * 0.05f + eyeOffsetY)
            val rightEyeCenter = Offset(center.x + orbRadius * 0.32f, center.y - orbRadius * 0.05f + eyeOffsetY)

            if (isDizzy) {
                // Comical spiral / cross eyes
                drawLine(
                    color = inkEyeColor,
                    start = Offset(leftEyeCenter.x - 12f, leftEyeCenter.y - 12f),
                    end = Offset(leftEyeCenter.x + 12f, leftEyeCenter.y + 12f),
                    strokeWidth = 5f
                )
                drawLine(
                    color = inkEyeColor,
                    start = Offset(leftEyeCenter.x + 12f, leftEyeCenter.y - 12f),
                    end = Offset(leftEyeCenter.x - 12f, leftEyeCenter.y + 12f),
                    strokeWidth = 5f
                )
                drawLine(
                    color = inkEyeColor,
                    start = Offset(rightEyeCenter.x - 12f, rightEyeCenter.y - 12f),
                    end = Offset(rightEyeCenter.x + 12f, rightEyeCenter.y + 12f),
                    strokeWidth = 5f
                )
                drawLine(
                    color = inkEyeColor,
                    start = Offset(rightEyeCenter.x + 12f, rightEyeCenter.y - 12f),
                    end = Offset(rightEyeCenter.x - 12f, rightEyeCenter.y + 12f),
                    strokeWidth = 5f
                )
            } else {
                // Normal glossy round eyes with white specular highlight
                drawCircle(color = inkEyeColor, radius = eyeHeight, center = leftEyeCenter)
                drawCircle(color = Color.White, radius = eyeHeight * 0.35f, center = Offset(leftEyeCenter.x + 4f, leftEyeCenter.y - 4f))

                drawCircle(color = inkEyeColor, radius = eyeHeight, center = rightEyeCenter)
                drawCircle(color = Color.White, radius = eyeHeight * 0.35f, center = Offset(rightEyeCenter.x + 4f, rightEyeCenter.y - 4f))
            }

            // 6. Mouth: changes with state
            val mouthY = center.y + orbRadius * 0.22f
            when (state) {
                AssistantState.SPEAKING -> {
                    // Open oval mouth pulsing to speech amplitude
                    val mouthOpen = 8f + audioAmplitude * 20f
                    drawOval(
                        color = inkEyeColor,
                        topLeft = Offset(center.x - 14f, mouthY - mouthOpen / 2f),
                        size = Size(28f, mouthOpen)
                    )
                }
                AssistantState.INTERRUPTED -> {
                    // Small surprised 'o'
                    drawCircle(color = inkEyeColor, radius = 9f, center = Offset(center.x, mouthY))
                }
                AssistantState.ERROR -> {
                    // Sad frown
                    drawArc(
                        color = inkEyeColor,
                        startAngle = 180f,
                        sweepAngle = 180f,
                        useCenter = false,
                        topLeft = Offset(center.x - 14f, mouthY),
                        size = Size(28f, 16f),
                        style = Stroke(width = 4f)
                    )
                }
                else -> {
                    // Sweet curved smile
                    drawArc(
                        color = inkEyeColor,
                        startAngle = 0f,
                        sweepAngle = 180f,
                        useCenter = false,
                        topLeft = Offset(center.x - 14f, mouthY - 8f),
                        size = Size(28f, 18f),
                        style = Stroke(width = 4f)
                    )
                }
            }

            // 7. Thinking dots
            if (state == AssistantState.THINKING) {
                val dotY = center.y - orbRadius * 1.15f
                drawCircle(color = sunshineColor, radius = 6f, center = Offset(center.x - 22f, dotY))
                drawCircle(color = sunshineColor, radius = 8f, center = Offset(center.x, dotY - 6f))
                drawCircle(color = sunshineColor, radius = 6f, center = Offset(center.x + 22f, dotY))
            }
        }
    }
}

package com.nahwerk.concierge

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal object NahwerkPalette {
    val Background = Color(0xFF070809)
    val Surface = Color(0xFF111214)
    val ElevatedSurface = Color(0xFF191A1D)
    val SoftSurface = Color(0xFF22201B)
    val PrimaryText = Color(0xFFF5F2EC)
    val SecondaryText = Color(0xFFBEBBB4)
    val Gold = Color(0xFFD7B66C)
    val GoldSoft = Color(0xFF3A3020)
    val Divider = Color(0xFF303136)
    val Success = Color(0xFF9FD5AE)
    val Warning = Color(0xFFF2CC7D)
    val Error = Color(0xFFFFB4AB)
}

internal object NahwerkSpacing {
    val Xs = 4.dp
    val Sm = 8.dp
    val Md = 12.dp
    val Lg = 16.dp
    val Xl = 20.dp
    val Xxl = 24.dp
    val Xxxl = 32.dp
}

internal object NahwerkRadii {
    val Small = 12.dp
    val Medium = 18.dp
    val Large = 24.dp
    val Hero = 28.dp
    val Pill = 999.dp
}

internal object NahwerkSizes {
    val Touch = 48.dp
    val PrimaryTouch = 54.dp
    val Icon = 22.dp
    val ComposerButton = 56.dp
}

private val NahwerkColorScheme = darkColorScheme(
    primary = NahwerkPalette.Gold,
    onPrimary = Color(0xFF211A0B),
    primaryContainer = NahwerkPalette.GoldSoft,
    onPrimaryContainer = NahwerkPalette.PrimaryText,
    background = NahwerkPalette.Background,
    onBackground = NahwerkPalette.PrimaryText,
    surface = NahwerkPalette.Surface,
    onSurface = NahwerkPalette.PrimaryText,
    surfaceVariant = NahwerkPalette.ElevatedSurface,
    onSurfaceVariant = NahwerkPalette.SecondaryText,
    outline = Color(0xFF77777C),
    outlineVariant = NahwerkPalette.Divider,
    error = NahwerkPalette.Error,
    onError = Color(0xFF3A0907)
)

private val NahwerkTypography = Typography(
    displaySmall = TextStyle(
        fontSize = 34.sp,
        lineHeight = 40.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = (-0.5).sp
    ),
    headlineMedium = TextStyle(
        fontSize = 28.sp,
        lineHeight = 34.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = (-0.25).sp
    ),
    headlineSmall = TextStyle(
        fontSize = 22.sp,
        lineHeight = 28.sp,
        fontWeight = FontWeight.SemiBold
    ),
    titleLarge = TextStyle(
        fontSize = 20.sp,
        lineHeight = 26.sp,
        fontWeight = FontWeight.SemiBold
    ),
    titleMedium = TextStyle(
        fontSize = 17.sp,
        lineHeight = 23.sp,
        fontWeight = FontWeight.Medium
    ),
    bodyLarge = TextStyle(
        fontSize = 17.sp,
        lineHeight = 25.sp,
        fontWeight = FontWeight.Normal
    ),
    bodyMedium = TextStyle(
        fontSize = 15.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.Normal
    ),
    bodySmall = TextStyle(
        fontSize = 13.sp,
        lineHeight = 19.sp,
        fontWeight = FontWeight.Normal
    ),
    labelLarge = TextStyle(
        fontSize = 14.sp,
        lineHeight = 20.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(
        fontSize = 12.sp,
        lineHeight = 17.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.25.sp
    ),
    labelSmall = TextStyle(
        fontSize = 11.sp,
        lineHeight = 16.sp,
        fontWeight = FontWeight.Medium,
        letterSpacing = 0.3.sp
    )
)

private val NahwerkShapes = Shapes(
    extraSmall = RoundedCornerShape(NahwerkRadii.Small),
    small = RoundedCornerShape(NahwerkRadii.Small),
    medium = RoundedCornerShape(NahwerkRadii.Medium),
    large = RoundedCornerShape(NahwerkRadii.Large),
    extraLarge = RoundedCornerShape(NahwerkRadii.Hero)
)

@Composable
internal fun NahwerkTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = NahwerkColorScheme,
        typography = NahwerkTypography,
        shapes = NahwerkShapes,
        content = content
    )
}

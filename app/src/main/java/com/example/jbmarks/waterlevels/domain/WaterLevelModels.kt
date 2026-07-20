package com.example.jbmarks.waterlevels.domain

enum class ReservoirStatus(val displayName: String) {
    STABLE("Stable"),
    CLIMBING("Climbing"),
    RECOVERING("Recovering"),
    CRITICAL("Critical"),
    DECLINING("Declining")
}

data class ReservoirConfig(
    val id: String,
    val name: String,
    val cluster: String,
    val capacityMl: Double? = null
)

data class ReservoirReading(
    val reservoirId: String,
    val levelPercent: Double,
    val status: ReservoirStatus
)

data class WaterLevelSubmission(
    val id: String = "",
    val submittedBy: String = "",
    val submittedByName: String = "",
    val submittedAt: String = "",
    val date: String = "",
    val readings: List<ReservoirReading> = emptyList()
)

object Reservoirs {
    val all: List<ReservoirConfig> = listOf(
        ReservoirConfig("vyfhoek_complex", "Vyfhoek Complex", "Vyfhoek"),
        ReservoirConfig("old_plant", "Old Plant", "Vyfhoek"),
        ReservoirConfig("ventersdorp_res1", "Res 1", "Ventersdorp", 15.0),
        ReservoirConfig("ventersdorp_res2", "Res 2", "Ventersdorp", 13.5),
        ReservoirConfig("ventersdorp_res3", "Res 3", "Ventersdorp", 9.5),
        ReservoirConfig("eesterandjies_5ml", "5ML", "Eesterandjies", 5.0),
        ReservoirConfig("eesterandjies_10ml", "10ML", "Eesterandjies", 10.0),
        ReservoirConfig("ikageng_main", "Main", "Ikageng"),
        ReservoirConfig("ikageng_west", "West", "Ikageng")
    )

    val clusters: List<String> = all.map { it.cluster }.distinct()

    fun byCluster(cluster: String): List<ReservoirConfig> =
        all.filter { it.cluster == cluster }
}


const baseURL =
  "https://api.weather.gc.ca/collections/swob-realtime/items";

// Convert degrees to compass direction
function getDirection(degrees) {
  const directions = [
    "N", "NE", "E", "SE",
    "S", "SW", "W", "NW"
  ];

  return directions[Math.round(degrees / 45) % 8];
}

// Live Toronto clock
function updateClock() {
  document.querySelector("#current-time").textContent =
    "Current time: " +
    new Date().toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "medium",
      timeStyle: "medium"
    });
}

// Display previously saved weather readings
function loadSavedWeather() {
  try {
    const saved = localStorage.getItem("lastWeather");

    if (!saved) return;

    const weather = JSON.parse(saved);

    document.querySelector("#wind-speed").textContent = weather.speed;
    document.querySelector("#wind-gust").textContent = weather.gust;
    document.querySelector("#wind-direction").textContent = weather.direction;
    document.querySelector("#sailing-condition").textContent = weather.sailing;

    document.querySelector("#weather-status").textContent =
      "Showing saved readings. Updating...";
  } catch (error) {
    console.error("Saved weather error:", error);
  }
}

// Retrieve latest Billy Bishop observation
let weatherRequestInProgress = false;

async function getWeather() {

  if (weatherRequestInProgress) return;

  weatherRequestInProgress = true;

  const status = document.querySelector("#weather-status");

  try {

    if (status) {
      status.textContent = "Fetching latest weather...";
    }

    // Search the last 24 hours
    const start = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const params = new URLSearchParams({
      bbox: "-79.42,43.61,-79.37,43.64",
      datetime: start.toISOString() + "/..",
      limit: "500",
      f: "json"
    });

    // Set a 15-second timeout
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    let response;

    try {
      response = await fetch(
        baseURL + "?" + params.toString(),
        {
          cache: "no-store",
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const data = await response.json();

    // Find Billy Bishop Airport observations
    const observations = data.features
      .filter(feature =>
        feature.properties["icao_stn_id-value"] === "CYTZ"
      )
      .sort((a, b) =>
        new Date(b.properties.obs_date_tm) -
        new Date(a.properties.obs_date_tm)
      );

    if (observations.length === 0) {
      throw new Error("No recent Billy Bishop observations found");
    }

    // Select newest observation
    const weather = observations[0].properties;

    console.log("Latest observation:", weather);

    // Get measurements in km/h
    const wind = Number(
      weather.avg_wnd_spd_10m_pst10mts
    );

    const gust = Number(
      weather.max_wnd_gst_spd_10m_pst10mts
    );

    const direction = Number(
      weather.avg_wnd_dir_10m_pst10mts
    );

    // Convert km/h to knots
    const windKnots = wind * 0.539957;
    const gustKnots = gust * 0.539957;

    // Display wind speed
    document.querySelector("#wind-speed").textContent =
      Number.isFinite(wind)
        ? windKnots.toFixed(1) + " knots"
        : "Unavailable";

    // Display wind gusts
    document.querySelector("#wind-gust").textContent =
      Number.isFinite(gust)
        ? gustKnots.toFixed(1) + " knots"
        : "Unavailable";

    // Display wind direction
    document.querySelector("#wind-direction").textContent =
      Number.isFinite(direction)
        ? getDirection(direction) + " (" + direction + "°)"
        : "Unavailable";

    // Create sailing recommendation
    let message;

    if (!Number.isFinite(windKnots) || !Number.isFinite(gustKnots)) {
      message = "Wind measurements unavailable.";
    }
    else if (windKnots < 5 && gustKnots < 10) {
      message = "Very light winds. Not much sailing breeze today.";
    }
    else if (windKnots < 10 && gustKnots < 15) {
      message = "Light breeze. Gentle sailing conditions.";
    }
    else if (windKnots < 15 && gustKnots < 20) {
      message = "Moderate breeze. Good conditions for recreational sailing.";
    }
    else if (windKnots < 20 && gustKnots < 25) {
      message = "Fresh winds. More challenging sailing conditions.";
    }
    else {
      message = "Strong winds or gusts. Potentially hazardous conditions.";
    }

    document.querySelector("#sailing-condition").textContent = message;

    // Save readings for the next visit
    const weatherDisplay = {
      speed: Number.isFinite(wind)
        ? windKnots.toFixed(1) + " knots"
        : "Unavailable",

      gust: Number.isFinite(gust)
        ? gustKnots.toFixed(1) + " knots"
        : "Unavailable",

      direction: Number.isFinite(direction)
        ? getDirection(direction) + " (" + direction + "°)"
        : "Unavailable",

      sailing: message
    };

    localStorage.setItem(
      "lastWeather",
      JSON.stringify(weatherDisplay)
    );

    // Update status
    if (status) {
      status.textContent = "Latest available airport observation";
    }

  } catch (error) {

    console.error("Weather error:", error);

    if (status) {
      status.textContent =
        error.name === "AbortError"
          ? "Weather request timed out. Try again shortly."
          : "Unable to retrieve weather data.";
    }

  } finally {
    weatherRequestInProgress = false;
  }
}

// Start clock and load saved weather
updateClock();
loadSavedWeather();

// Fetch fresh weather
getWeather();

// Update clock every second
setInterval(updateClock, 1000);

// Refresh weather every 5 minutes
setInterval(getWeather, 5 * 60 * 1000);

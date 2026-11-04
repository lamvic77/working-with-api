const apiURL =
  "https://api.open-meteo.com/v1/forecast?latitude=43.65&longitude=-79.38&current=wind_speed_10m";

fetch(apiURL)
  .then((response) => response.json())
  .then((data) => {
    let wind = data.current.wind_speed_10m;

    document.querySelector("#wind-speed").textContent =
      "Wind speed: " + wind + " km/h";

    let boat = document.querySelector("#boat");

    boat.style.transform = `translateX(${wind * 10}px) rotate(${wind * 10}deg)`;
  });

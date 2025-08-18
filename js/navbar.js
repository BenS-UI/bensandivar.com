document.addEventListener("DOMContentLoaded", () => {
  fetch("/ben-sandivar-site/homesplits/navbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("navbar-slot").innerHTML = data;
    });
});
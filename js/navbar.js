document.addEventListener("DOMContentLoaded", () => {
  fetch("/homesplits/navbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("navbar-slot").innerHTML = data;
    });
});
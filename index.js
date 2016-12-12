+ #!/usr/bin/env node

const fetch = require('node-fetch')
const cmd = require('node-cmd')
const chalk = require('chalk')
const config = require('./config.js')

function convertKtoF(k) {
  return Math.round(k * 1.8 - 459.67)
}

function convertKtoC(k) {
  return Math.round(k - 273.15)
}

function prettyFormatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
}

function prettyFormat(weatherData, icon, color) {
  return `\n ${chalk.cyan.underline.bold(`Weather in ${weatherData.name}`)} \n
     ${chalk.green.bold('Condition')}: ${icon}  ${chalk[color](weatherData.weather[0].description)}
     ${chalk.red.bold('Temperature')}: ${convertKtoF(weatherData.main.temp)}°F (High: ${convertKtoF(weatherData.main.temp_max)} / Low: ${convertKtoF(weatherData.main.temp_min)})
     ${chalk.yellow.bold('Sunrise')}: ${prettyFormatTime(weatherData.sys.sunrise)}
     ${chalk.gray.bold('Sunset')}: ${prettyFormatTime(weatherData.sys.sunset)} \n`
}

function getForecast(zipOrCity, country) {
  let data

  // get parameters or set defaults
  q = zipOrCity ? zipOrCity.split(',')[0] : config.defaultQuery
  country = country || (zipOrCity ? zipOrCity.split(',')[1] : false) || config.defaultCountryCode

  // build query
  const queryType = Number.isInteger(+zipOrCity) ? 'zip' : 'q'
  url = `http://api.openweathermap.org/data/2.5/weather?${queryType}=${q},${country}&APPID=${config.apiKey}`

  fetch(url).then( res => {
    return res.json()
  }).then( data => {
    let icon
    let color = config.defaultColor

    const condition = data.weather[0].id
    switch(+Math.floor(condition/100)) {
      case 2: icon = '⛈'; color = 'blue'; break
      case 3: icon = '💧'; color = 'blue'; break
      case 5: icon = '🌧'; color = 'blue'; break
      case 6: icon = '⛄️'; break
      case 7: icon = '⬜️'; color = 'gray'; break
      case 8:
        if (Date.now() > data.sys.sunset) {
          icon = '🌘'; break
        }
        switch (condition) {
          case 800: icon = '☀️'; color = 'yellow'; break
          case 801: icon = '🌤'; color = 'yellow'; break
          case 802: icon = '⛅️'; color = 'yellow'; break
          case 803: icon = '🌥'; break
          case 804: icon = '☁️'; break
        }; break
      case 9:
        switch (condition) {
          case 900: icon = '🌪'; color = 'red';break
          case 901: case 902: case 960: case 961: case 962:
            icon = '🌊'; color = 'red'; break
          case 903: icon = '🍦'; break
          case 904: icon = '🔥'; color = 'red'; break
          case 905: case 951: case 952: case 953: case 954:
          case 955: case 956: case 957: case 958: case 959:
            icon = '🍃'; break
          case 906: icon = '☃️'; break
        } break
    }
    cmd.run(`echo 'export WEATHER_ICON="${icon}"' > ~/.weather_prompt`)
    console.log( prettyFormat(data, icon, color) )
  })
}

getForecast(process.argv[2] || false, process.argv[3] || false)

#!/usr/bin/env node

const fetch = require('node-fetch')
const cmd = require('node-cmd')
const chalk = require('chalk')
const os = require('os')
const config = require( os.homedir() + '/.weather_prompt_config')

function convertKtoF(k) {
  return Math.round(k * 1.8 - 459.67)
}

function convertKtoC(k) {
  return Math.round(k - 273.15)
}

function getMoonIcon() {
  // January 1, 1970 was a waning half moon
  const averageCycleLength = 29.53
  const initialOffset = 21
  const dayLength = (24 * 60 * 60 * 1000)
  var daysIntoCycle = ( Date.now() - new Date(0) ) / dayLength % averageCycleLength - initialOffset
  var cycle = Math.round(daysIntoCycle / 4)
  switch(cycle) {
    case 0: return '🌕';
    case 1: return '🌖';
    case 2: return '🌗';
    case 3: return '🌘';
    case 4: return '🌑';
    case 5: return '🌒';
    case 6: return '🌓';
    case 7: return '🌔';
  }
}

function getIconAndColor(data) {
  let icon
  let color = config.defaultColor
  const condition = data.weather[0].id

  switch(+Math.floor(condition/100)) {
    case 2: icon = '⛈'; color = 'blue'; break
    case 3: icon = '💧'; color = 'blue'; break
    case 5: icon = '🌧'; color = 'blue'; break
    case 6: icon = '⛄️'; break
    case 7: icon = '🌫'; color = 'gray'; break
    case 8:
      var timestamp = Date.now() / 1000
      if (timestamp > data.sys.sunset || timestamp < data.sys.sunrise) {
        icon = getMoonIcon(); break
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
          icon = '🍃'; break
        case 955: case 956: case 957: case 958: case 959:
          icon = '💨'; break
        case 906: icon = '☃️'; break
      } break
  }

  return [icon, color]
}

function prettyFormatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
}

function prettyFormat(data, icon, color) {
  return `\n ${chalk.cyan.underline.bold(`Weather in ${data.name}`)} \n
     ${chalk.green.bold('Condition')}: ${icon}  ${chalk[color](data.weather[0].description)}
     ${chalk.red.bold('Temperature')}: ${convertKtoF(data.main.temp)}°F (High: ${convertKtoF(data.main.temp_max)} / Low: ${convertKtoF(data.main.temp_min)})
     ${chalk.yellow.bold('Sunrise')}: ${prettyFormatTime(data.sys.sunrise)}
     ${chalk.gray.bold('Sunset')}: ${prettyFormatTime(data.sys.sunset)} \n`
}

function getForecast(zipOrCity, country) {
  // get parameters or set defaults
  q = zipOrCity ? zipOrCity.split(',')[0] : config.defaultQuery
  country = country || (zipOrCity ? zipOrCity.split(',')[1] : false) || config.defaultCountryCode

  // build query
  const queryType = Number.isInteger(+zipOrCity) ? 'zip' : 'q'
  url = `http://api.openweathermap.org/data/2.5/weather?${queryType}=${q},${country}&APPID=${config.apiKey}`

  fetch(url).then( res => {
    return res.json()
  }).then( data => {
    let [icon, color] = getIconAndColor(data)
    if (config.destinationFile) {
      cmd.run(`echo 'export WEATHER_ICON="${icon}"' > ${config.destinationFile}`)
      cmd.run(`echo 'export WEATHER_TEMP="${convertKtoF(data.main.temp)}°F"' >> ${config.destinationFile}`)
      cmd.run(`echo 'export WEATHER_TEMP_HI="${convertKtoF(data.main.temp_max)}°F"' >> ${config.destinationFile}`)
      cmd.run(`echo 'export WEATHER_TEMP_LOW="${convertKtoF(data.main.temp_min)}°F"' >> ${config.destinationFile}`)
      cmd.run(`echo 'export WEATHER_SUNRISE="${prettyFormatTime(data.sys.sunrise)}"' >> ${config.destinationFile}`)
      cmd.run(`echo 'export WEATHER_SUNSET="${prettyFormatTime(data.sys.sunset)}"' >> ${config.destinationFile}`)
    }
    console.log( prettyFormat(data, icon, color) )
  })
}

getForecast(process.argv[2] || false, process.argv[3] || false)

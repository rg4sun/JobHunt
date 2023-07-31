<template>
  <q-page class="flex flex-center">
    <div class="search-bar">
      <q-input outlined filled v-model="text" label="Industry" />
    </div>

    <q-range
      class="zoom-select"
      v-model="zoomRange"
      :min="0"
      :max="20"
      @change="zoomChange"
      :drag-range="false"
      markers
      label>
    </q-range>

    <div class="info-box-job" v-if="showJobInfoBox">
      <div class="head">Job Info Details</div>
      <hr />
      <div class="line">
        <span class="title">🏠 Selected Area: </span> <br />
        <span class="txt">London</span>
      </div>
      <hr />

      <div class="line">
        <span class="title">⌨️ Job Keywords: </span> <br />
        <span class="txt">Software Developer</span>
      </div>
      <hr />

      <div class="line">
        <span class="title">💰 Average Salary: </span> <br />
        <span class="txt">£41,785(annual, approx.)</span>
      </div>
      <hr />

      <div class="line">
        <span class="title">👨‍💻 Jobs in Hiring: </span> <br />
        <span class="txt">763(approx.)</span>
      </div>
    </div>

    <div class="info-box-crime" v-if="showCrimeInfoBox">
      <div class="head">Crime Statistics Nearby</div>
      <hr />
      <div class="line">
        <span class="title">Total: </span>
        <span class="txt">{{ crimeTotal }}</span>
        <span class="title">Last Update: </span>
        <span>2023-03</span>
      </div>
      <hr />

      <div
        class="line"
        v-for="(item, index) in Object.keys(crimeTypeCount)"
        :key="index">
        <span class="title">{{ item }}: </span>
        <span class="txt">{{ crimeTypeCount[item] }}</span>
      </div>
    </div>

    <div class="loading-box" v-if="isLoading">
      <q-spinner-bars size="10em" color="purple" />
      <div class="loading-txt">Loading data...</div>
    </div>

    <div class="color-strip" ref="colorStrip" v-if="isColorStripShow">
      <div
        v-for="(color, index) in colors"
        :key="index"
        :style="{ backgroundColor: color, opacity: opacity }"
        @mousemove="onColorStripMouseMove($event, index)"
        @mouseleave="onColorStripMouseLeave"></div>
      <div class="color-value" v-if="showColorValue">
        {{ currentColorValue }} K
      </div>
    </div>

    <!-- Rental dialog -->
    <q-dialog v-model="showRental" id="rental-dialog">
      <q-card style="width: 800px; max-width: 800px">
        <q-card-section>
          <div class="text-h6"></div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-table
            title="Nearby House Price"
            :rows="rows"
            :columns="columns"
            row-key="id" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div id="map" ref="mapDOM"></div>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import DATA from '../data'
import mapboxgl from '../utils/MapboxConfig.js'
import { drawCircle, genColorByValue, getCrimeData } from '../utils'
import { ref } from 'vue'

const { JOB_INFO, JOB_DENSITY, COUNTRY_BOUND, UK_ZONE, RENTAL } = DATA

const ZONE_JOBS = {}
new Set(JOB_DENSITY.map(item => item.Location)).forEach(item => {
  ZONE_JOBS[item] = 0
})

JOB_DENSITY.map(item => {
  ZONE_JOBS[item.Location] += parseInt(item.sum)
})

export default defineComponent({
  name: 'IndexPage',
  data() {
    return {
      JOB_INFO,
      JOB_DENSITY,
      ZONE_JOBS,
      COUNTRY_BOUND,
      UK_ZONE,
      RENTAL,
      map: null,
      // NOTE: zone color ctrls
      colors: [],
      currentColorIndex: -1,
      showColorValue: false,
      currentColorValue: 0,
      maxColorValue: 5500,
      opacity: 0.7,
      isColorStripShow: true,
      popup: null,
      // NOTE: display category
      category: 'Job Density',
      zoomRange: {
        min: 0,
        max: 12,
      },
      jobMarkers: [],
      crimeMarkers: [],
      isLoading: false,
      showJobInfoBox: false,
      showCrimeInfoBox: false,
      text: '',
      showRental: false,
      crimeTotal: 100,
      crimeTypeCount: {},
      rows: [],
      columns: [],
    }
  },
  methods: {
    initMap() {
      this.map = new mapboxgl.Map({
        container: this.$refs.mapDOM,
        style: 'mapbox://styles/mapbox/streets-v12',
        // center: [-1.4001991, 50.9434623], // Glen Eyre
        // center: [lng, lat], // Glen Eyre
        // zoom: 12,
      })

      this.map.fitBounds(this.COUNTRY_BOUND['GB'][1], { padding: 30 })

      this.map.on('load', () => {
        this.genZones()
      })

      this.map.on('zoom', () => {
        console.log('Zoom: ', this.map.getZoom())
        const zoomVal = this.map.getZoom()
        this.zoomUpdate(zoomVal)
      })
    },
    zoomChange(value) {
      console.log('zoomRange:', value)
      this.map.setZoom(value.max)
    },
    zoomUpdate(zoom) {
      this.zoomRange.max = zoom
    },

    drawMapLocate(radius = 1) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lng = position.coords.longitude
          const lat = position.coords.latitude
          this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            // center: [-1.4001991, 50.9434623], // Glen Eyre
            center: [lng, lat], // Glen Eyre
            zoom: 12,
          })

          // Add geolocate control to the map.
          const geolocateCtrl = new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: true,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            showUserHeading: true,
          })

          map.addControl(geolocateCtrl)

          map.on('load', () => {
            // trgger loate
            geolocateCtrl.trigger()

            geolocateCtrl.on('geolocate', position => {
              const { longitude, latitude } = position.coords

              drawCircle(map, longitude, latitude, radius)
              map.setZoom(13)
            })
          })
        },
        err => {
          console.error('Please enable location service! Err: ', err)
        },
        {
          enableHighAccuracy: true,
        }
      )
    },
    genZones() {
      UK_ZONE.features.forEach((item, index) => {
        const zoneName = item.properties.name
        const zoneCoords = item.geometry.coordinates
        const goeType = item.geometry.type

        this.map.addSource(zoneName, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: goeType,
              coordinates: zoneCoords,
            },
          },
        })

        // Add a new layer to visualize the polygon.
        this.map.addLayer({
          id: `zoneFill-${index}-${zoneName}`, // layer id will be used in popup ctrls
          type: 'fill',
          source: zoneName, // reference the data source
          layout: {},
          paint: {
            'fill-color': genColorByValue(
              ZONE_JOBS[zoneName],
              this.maxColorValue
            ),
            'fill-opacity': this.opacity,
          },
        })
        // Add a black outline around the polygon.
        this.map.addLayer({
          id: `zoneOutline-${index}-${zoneName}`,
          type: 'line',
          source: zoneName,
          layout: {},
          paint: {
            'line-color': '#000',
            'line-width': 1,
          },
        })

        // START: popup ctrls
        const popupDOM = document.createElement('div')
        popupDOM.innerHTML = `
        <h5>${zoneName}</h5>
        <div class='total'>Job Amount: ${ZONE_JOBS[zoneName]} K</div>
        <hr/>
        `

        JOB_DENSITY.forEach(item => {
          if (item.Location == zoneName) {
            popupDOM.innerHTML += `
            <div class='box'>
              <span class='industry'>${item.Industry}: </span>
              <span class='sum'>${item.sum} K</span>
            </div>
            `
          }
        })

        // styles setting
        const headElem = popupDOM.querySelector('h5')
        headElem.style.fontSize = '30px'
        headElem.style.fontWeight = 'bold'
        headElem.style.margin = '10px 2px'
        headElem.style.textAlign = 'center'

        const totalElem = popupDOM.querySelector('.total')
        totalElem.style.textAlign = 'center'
        totalElem.style.fontSize = '20px'

        const industryElems = popupDOM.querySelectorAll('.industry')
        industryElems.forEach(item => {
          item.style.fontWeight = 'bold'
        })

        this.map.on('mousemove', `zoneFill-${index}-${zoneName}`, e => {
          if (this.popup) {
            this.popup.remove()
          }

          this.popup = new mapboxgl.Popup({
            closeButton: false, // diable closeButton
            maxWidth: 700,
          })
            .setLngLat(e.lngLat)
            .setDOMContent(popupDOM)
            .addTo(this.map)
        })

        this.map.on('mouseleave', `zoneFill-${index}-${zoneName}`, () => {
          if (this.popup) {
            this.popup.remove()
            this.popup = null
          }
          this.map.getCanvas().style.cursor = ''
        })
        // END: popup ctrls

        // NOTE: Click London, zoom to fit London and show Jobs in London
        // TODO: change london boundary style
        if (zoneName == 'London') {
          this.map.on('click', `zoneFill-${index}-${zoneName}`, () => {
            console.log('London clicked')
            // Clear Job Density Zones
            this.clearZones()
            this.hideColorStrip()

            this.map.setCenter([-0.1278, 51.5074]) // center of London
            this.map.setZoom(10)

            // draw London boundary
            this.map.addSource(zoneName, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: goeType,
                  coordinates: zoneCoords,
                },
              },
            })

            this.map.addLayer({
              id: `zoneOutline-${index}-${zoneName}`,
              type: 'line',
              source: zoneName,
              layout: {},
              paint: {
                'line-color': '#000',
                'line-width': 1,
              },
            })

            // load jobs
            this.showJobs()
          })
        }
      })
    },
    clearZones() {
      // TODO: clear zones
      UK_ZONE.features.forEach((item, index) => {
        const zoneName = item.properties.name
        this.map.removeLayer(`zoneFill-${index}-${zoneName}`)
        this.map.removeLayer(`zoneOutline-${index}-${zoneName}`)
        this.map.removeSource(zoneName)
      })
    },
    // Color bar controls
    onColorStripMouseMove(event, index) {
      console.log('moose')
      this.currentColorIndex = index
      this.showColorValue = true
      this.currentColorValue = Math.round(
        (index / this.colors.length) * this.maxColorValue
      )
      const rect = event.target.getBoundingClientRect()
      const x = event.clientX - rect.left - 50
      const y = event.clientY - rect.top
      this.$nextTick(() => {
        const valueEl = this.$el.querySelector('.color-value')
        valueEl.style.left = `${x}px`
        valueEl.style.top = `${y}px`
      })
    },
    onColorStripMouseLeave() {
      this.currentColorIndex = -1
      this.showColorValue = false
    },
    initColorStrip() {
      for (let i = 0; i <= 100; i += 5) {
        const color = genColorByValue(i, 100)
        this.colors.push(color)
      }
    },
    showColorStrip() {
      // this.$refs.colorStrip.style.display = 'block'
      this.isColorStripShow = true
    },
    hideColorStrip() {
      // this.$refs.colorStrip.style.display = 'none'
      this.isColorStripShow = false
    },
    // START: category ctrls
    showDensity() {
      this.category = 'Job Density'
      console.log(this.category)
      console.log('Now loading Job Density...')
      this.genZones()
      this.showColorStrip()
    },
    showJobs() {
      this.category = 'Jobs'
      console.log(this.category)
      console.log('Now loading Jobs....')
      // this.clearZones()
      // this.hideColorStrip()
      console.log(JOB_INFO)

      JOB_INFO.forEach((item, index) => {
        const infoDOM = document.createElement('div')
        infoDOM.classList.add(`job-info`)
        infoDOM.innerHTML = `
        <h5 class='title'>${item.jobTitle}</h5>
        <div class='salary'>
          <span class='cat'>Salary range:</span> £${item.minimumSalary} ~ £${item.maximumSalary}
        </div>
        <div class='employer'>
          <span class='cat'>Company:</span> ${item.employerName}
        </div>
        <hr/>
        <div class='desc'>
          <span class='cat'>Description:</span> ${item.jobDescription}
        </div>
        <div class='date'>
          <span class='cat'>Release Date:</span> ${item.date}
        </div>
        <div class='expire'>
          <span class='cat'>Expiration Date:</span> ${item.expirationDate}
        </div>
        <div class='link'>
          <span class='cat'>Job Link:</span> <a href="${item.jobUrl}">${item.jobUrl}</a>
        </div>
        <div class='btn-group'>
          <button id='crime' lng='${item.lng}' lat='${item.lat}'>Show nearby crimes</button>
          <button id='rental' lng='${item.lng}' lat='${item.lat}'>Show nearby house prices</button>
        </div>
        `
        // START: popup style
        const jobTitleDOM = infoDOM.querySelector('h5')
        jobTitleDOM.style.margin = '10px 0'
        jobTitleDOM.style.fontWeight = 'bold'
        jobTitleDOM.style.padding = '10px 10px'
        jobTitleDOM.style.backgroundColor = '#3a0071'
        jobTitleDOM.style.color = 'aliceblue'

        infoDOM.querySelectorAll('.cat').forEach(item => {
          item.style.fontWeight = 'bold'
        })
        infoDOM.querySelectorAll('.btn-group button').forEach(item => {
          item.style.fontWeight = 'bold'
          item.style.marginTop = '10px'
          item.style.marginRight = '10px'
          item.style.backgroundColor = '#3a0071'
          item.style.color = 'aliceblue'
          item.style.borderColor = 'antiquewhite'
          item.style.borderRadius = '10px'
          item.style.height = '35px'
        })

        // START: btn events
        // NOTE: show crimes
        infoDOM.querySelector('#crime').addEventListener('click', e => {
          console.log('crime btn clicked!')
          // console.log('btn dom: ', e.target)
          const lng = parseFloat(e.target.getAttribute('lng'))
          const lat = parseFloat(e.target.getAttribute('lat'))
          console.log(lat, lng)

          // move center to job location and zomm
          this.map.setCenter([lng, lat])
          this.map.setZoom(12)

          // clear other job markers
          this.clearJobMarks(index)

          // load crimes within 1 mile of selected job
          this.showCrimes(lng, lat)
        })

        // NOTE: show rental
        infoDOM.querySelector('#rental').addEventListener('click', () => {
          console.log('rental btn clicked!')
          this.showRental = true
          console.log('RENTAL Data: ', this.RENTAL)
        })
        // END: btn events

        // const popup = new mapboxgl.Popup().setHTML('hello')
        const popup = new mapboxgl.Popup({
          offset: 0,
          maxWidth: '700px',
        }).setDOMContent(infoDOM)

        const marker = new mapboxgl.Marker({
          color: '#5700ac',
          scale: 0.8,
        })
          .setLngLat([item.lng, item.lat])
          .setPopup(popup)
          .addTo(this.map)

        this.jobMarkers.push(marker)

        // UNWORK evt, don't know why
        // marker.on('click', () => {
        //   console.log('Marker clicked', `job_${index}`)
        //   const markerElem = marker.getElement()
        //   markerElem.style.zIndex = 99
        // })
      })

      this.showJobInfoBox = true
    },
    clearJobMarks(excludeIndex) {
      this.jobMarkers.forEach((marker, index) => {
        if (index != excludeIndex) {
          marker.remove()
        } else {
          // close popup
          marker.togglePopup()
        }
      })
    },
    clearAllJobMarks() {
      this.jobMarkers.forEach(marker => {
        marker.remove()
      })
    },
    async showCrimes(lng, lat, time = null) {
      this.showJobInfoBox = false

      this.category = 'Crimes'
      console.log(this.category)
      console.log('Now loading crimes....')

      this.isLoading = true

      const crimeData = await getCrimeData(lng, lat)
      console.log('Crime data: ', crimeData)

      crimeData.data.forEach((item, index) => {
        const { latitude, longitude } = item.location
        const street = item.location.street.name
        const type = item.category
        const month = item.month

        if (this.crimeTypeCount[type] == undefined) {
          this.crimeTypeCount[type] = 0
        } else {
          this.crimeTypeCount[type]++
        }

        const popupDOM = document.createElement('div')

        popupDOM.innerHTML = `
        <h5 style='margin: 5px 0px'>${street}, ${type}, ${month}</h5>
        `

        const popup = new mapboxgl.Popup({
          maxWidth: 500,
        }).setDOMContent(popupDOM)

        const marker = new mapboxgl.Marker({
          color: 'red',
          scale: 0.5,
        })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(this.map)

        this.crimeMarkers.push(marker)
      })

      this.crimeTotal = crimeData.data.length

      this.map.setZoom(13.5)
      this.isLoading = false

      this.showCrimeInfoBox = true
    },
  },

  created() {
    console.log(DATA)
    console.log(ZONE_JOBS)

    // create color bar
    this.initColorStrip()

    this.columns = [
      {
        name: 'id',
        required: true,
        label: 'id',
        align: 'left',
        field: row => row.id,
        format: val => `${val}`,
        sortable: true,
      },
      {
        name: 'district',
        label: 'District',
        align: 'left',
        field: 'district',
        sortable: true,
      },
      {
        name: 'road',
        label: 'Road',
        align: 'left',
        field: 'road',
        sortable: true,
      },
      {
        name: 'postcode',
        label: 'Postcode',
        align: 'left',
        field: 'postcode',
        sortable: true,
      },
      {
        name: 'price',
        label: 'Price',
        align: 'left',
        field: 'price',
        format: val => `£${val}`,
        sortable: true,
      },
    ]

    this.rows = this.RENTAL.map((item, index) => {
      return {
        id: index,
        district: item.District,
        road: item.Road,
        postcode: item.Postcode,
        price: item.Price,
      }
    })
  },
  mounted() {
    // this.drawMapLocate()
    this.initMap()
    // this.drawZones()
  },
})
</script>

<style lang="scss" scoped>
#map {
  // width: 1000px;
  // height: 800px;
  width: 100vw;
  height: 100vh;
}

.loading-box {
  position: absolute;
  // top: 35;
  z-index: 99;
  // display: flex;
  // justify-content: center;
  text-align: center;

  .loading-txt {
    color: purple;
    font-size: 50px;
  }
}

.search-bar {
  position: absolute;
  top: 60px;
  left: 20px;
  z-index: 99;
  min-width: 320px;
  min-height: 50px;
  // background-color: salmon;
  background-color: white;
  // opacity: ;
  border-style: solid;
  border-width: 2px;
  border-radius: 10px;
}

.zoom-select {
  position: absolute;
  width: 300px;
  top: 20px;
  left: 30px;
  z-index: 99;
}

.color-strip {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  width: 10px;
  height: 100px;
  position: absolute;
  right: 20px;
  top: 70px;
  z-index: 99;
}

.color-strip div {
  flex: 1 1 0;
  // height: 100%;
  cursor: pointer;
}

.color-value {
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 10px;
  pointer-events: none;
  white-space: nowrap;
}

// :deep(.mapboxgl-popup-content) {
//   background-color: salmon;
// }

.info-box-job {
  position: absolute;
  top: 130px;
  left: 20px;
  width: 320px;
  height: 400px;
  border-radius: 20px;
  border-style: solid;
  border-width: 2px;
  background-color: #fff;
  // background-color: antiquewhite;
  opacity: 0.7;
  z-index: 99;

  .head {
    // box-sizing: border-box;
    margin: 20px;
    font-size: 30px;
    text-align: center;
    font-weight: bold;
    // background-color: black;
    // color: aliceblue;
    // border-radius: 20px;
    // padding: 10px;
  }

  .line {
    margin-bottom: 10px;
    font-size: 20px;
    .title {
      font-weight: bold;
      padding-left: 10px;
      // background-color: black;
      // color: aliceblue;
    }
    .txt {
      padding-left: 40px;
    }
  }
}

.info-box-crime {
  position: absolute;
  top: 130px;
  left: 20px;
  width: 320px;
  // height: 400px;
  border-radius: 20px;
  border-style: solid;
  border-width: 2px;
  background-color: #fff;
  // background-color: antiquewhite;
  opacity: 0.7;
  z-index: 99;

  .head {
    // box-sizing: border-box;
    margin: 10px;
    font-size: 30px;
    text-align: center;
    font-weight: bold;
    // background-color: black;
    // color: aliceblue;
    // border-radius: 20px;
    // padding: 10px;
  }

  .line {
    margin-bottom: 3px;
    font-size: 20px;
    .title {
      font-weight: bold;
      padding-left: 10px;
      // background-color: black;
      // color: aliceblue;
    }
  }
}
</style>

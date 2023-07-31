import * as turf from '@turf/turf'
import { apiCrime } from 'src/boot/axios'

export function drawCircle(map, longitude, latitude, radius = 1) {
  // const radius = 1 // 单位为千米
  const options = {
    steps: 64, // 圆形边缘的分段数
    units: 'kilometers',
  }
  const circle = turf.circle([longitude, latitude], radius, options)

  map.addSource('circle', {
    type: 'geojson',
    data: circle,
  })

  map.addLayer({
    id: 'circle',
    type: 'line',
    source: 'circle',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#3388FF',
      'line-opacity': 0.8,
      'line-width': 2,
      'line-dasharray': [2, 2], // 值为一个长度为2的数组，其中第一个值表示实线的长度，第二个值表示空白的长度
    },
  })
}

export function genColorByValue(value, maxValue) {
  // 计算颜色的亮度，亮度与数值成正比
  const brightness = Math.round((value / maxValue) * 255)

  // 计算红色和绿色分量
  const red = brightness
  const green = 255 - brightness

  // 将分量转换为16进制字符串，并补全到两位
  const redHex = red.toString(16).padStart(2, '0')
  const greenHex = green.toString(16).padStart(2, '0')

  // 返回颜色字符串，以红色和绿色分量为基础，蓝色分量为0xff
  return `#${redHex}${greenHex}ff`
}

export async function getCrimeData(lng, lat, time = null) {
  const ret = await apiCrime.get(
    `crimes-street/all-crime?lat=${lat}&lng=${lng}`
  )
  return ret
}

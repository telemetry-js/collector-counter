'use strict'

const test = require('tape')
const counter = require('.')

test('delta counter', async function (t) {
  t.plan(4)

  const delta = counter.delta('test.delta')
  const collector = delta()
  const common = { name: 'test.delta', unit: 'count', resolution: 60, statistic: 'sum' }
  const expect = (value) => Object.assign({}, common, { value })

  t.same(await collect(collector), [expect(0)], 'initial value is 0')

  delta.increment()

  t.same(await collect(collector), [expect(1)], 'value can be incremented')
  t.same(await collect(collector), [expect(0)], 'value resets after submission')

  delta.increment(5)
  delta.increment(5)

  t.same(await collect(collector), [expect(10)], 'value can be incremented more than once')
})

test('persistent counter', async function (t) {
  t.plan(4)

  const acc = counter.persistent('test.count')
  const collector = acc()
  const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: 'average' }
  const expect = (value) => Object.assign({}, common, { value })

  t.same(await collect(collector), [expect(0)], 'initial value is 0')

  acc.increment()

  t.same(await collect(collector), [expect(1)], 'value can be incremented')
  t.same(await collect(collector), [expect(1)], 'value does not reset')

  acc.increment(5)
  acc.increment(5)

  t.same(await collect(collector), [expect(11)], 'value can be incremented more than once')
})

test('rate counter', async function (t) {
  t.plan(3)

  const rate = counter.rate('test.cps')
  const collector = rate()
  const common = { name: 'test.cps', unit: 'count/second', resolution: 60, statistic: 'average' }
  const expect = (value) => Object.assign({}, common, { value })

  await start(collector)

  rate.increment()
  await sleep(10)
  t.same(await collect(collector, true), [expect(1)], 'elapsed seconds rounds up to 1')

  rate.increment(2)
  await sleep(1e3)
  t.same(await collect(collector, true), [expect(2)], 'value can be incremented')

  await sleep(1e3)
  t.same(await collect(collector), [expect(0)], 'value resets')
})

function collect (collector, round) {
  return new Promise((resolve, reject) => {
    const metrics = []

    collector.on('metric', metrics.push.bind(metrics))

    collector.ping((err) => {
      if (err) return reject(err)

      metrics.forEach(simplify)
      if (round) metrics.forEach(roundValue)

      resolve(metrics)
    })
  })
}

function start (collector) {
  return new Promise((resolve, reject) => {
    collector.start((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function simplify (metric) {
  delete metric.tags
  delete metric.date

  return metric
}

function roundValue (metric) {
  metric.value = Math.round(metric.value)
}

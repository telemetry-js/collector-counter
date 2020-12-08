'use strict'

const EventEmitter = require('events').EventEmitter
const singleMetric = require('@telemetry-js/metric').single

exports.persistent = createPlugin.bind(null, {
  isPersistent: true,
  statistic: 'average',
  unit: 'count'
})

exports.delta = createPlugin.bind(null, {
  statistic: 'sum',
  unit: 'count'
})

exports.rate = createPlugin.bind(null, {
  isRate: true,
  statistic: 'average',
  unit: 'count/second'
})

function createPlugin (factoryOptions, name, metricOptions) {
  const states = []

  const pluginFn = function () {
    const state = { value: 0 }
    states.push(state)
    return new CounterCollector(factoryOptions, state, name, metricOptions)
  }

  pluginFn.increment = function (n) {
    for (const state of states) {
      state.value += n == null ? 1 : n
    }
  }

  pluginFn.decrement = function (n) {
    for (const state of states) {
      state.value -= n == null ? 1 : n
    }
  }

  return pluginFn
}

class CounterCollector extends EventEmitter {
  constructor (factoryOptions, state, name, metricOptions) {
    super()

    this._isPersistent = factoryOptions.isPersistent === true
    this._isRate = factoryOptions.isRate === true
    this._lastPing = null

    this._name = name
    this._state = state

    this._metricOptions = Object.assign({
      unit: factoryOptions.unit,
      statistic: factoryOptions.statistic
    }, metricOptions)
  }

  start (callback) {
    this._lastPing = Date.now()
    process.nextTick(callback)
  }

  ping (callback) {
    // TODO: reuse metric objects between pings
    const metric = singleMetric(this._name, this._metricOptions)
    const value = this._state.value

    if (!this._isPersistent) {
      this._state.value = 0
    }

    if (this._isRate) {
      // TODO (later): emitWarning if pinged more than once per second
      const now = Date.now()
      const elapsedSeconds = Math.max(1, (now - this._lastPing) / 1000)
      const rate = value / elapsedSeconds

      if (Number.isFinite(rate)) {
        metric.record(rate)
        this.emit('metric', metric)
      }

      this._lastPing = now
    } else if (Number.isFinite(value)) {
      metric.record(value)
      this.emit('metric', metric)
    }

    // No need to dezalgo ping()
    callback()
  }

  stop (callback) {
    this._lastPing = null
    process.nextTick(callback)
  }
}

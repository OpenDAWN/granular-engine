/* written in ECMAscript 6 */
/**
 * @fileoverview WAVE audio granular synthesis engine
 * @author Norbert.Schnell@ircam.fr, Victor.Saiz@ircam.fr, Karim.Barkati@ircam.fr
 */
"use strict";

var TimeEngine = require("time-engine");

/**
 * @class GranularEngine
 */
var GranularEngine = (function(super$0){var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){if(PRS$0){o["__proto__"]=p;}else {DP$0(o,"__proto__",{"value":p,"configurable":true,"enumerable":false,"writable":true});}return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(GranularEngine, super$0);var proto$0={};
  /**
   * @constructor
   * @param {AudioBuffer} buffer initial audio buffer for granular synthesis
   *
   * The engine implements the "scheduled" interface.
   * The grain position (grain onset or center time in the audio buffer) is optionally
   * determined by the engine's currentPosition attribute.
   */
  function GranularEngine() {var options = arguments[0];if(options === void 0)options = {};var audioContext = arguments[1];if(audioContext === void 0)audioContext = null;
    super$0.call(this, audioContext);

    /**
     * Audio buffer
     * @type {AudioBuffer}
     */
    this.buffer = options.buffer || null;

    /**
     * Absolute grain period in sec
     * @type {Number}
     */
    this.periodAbs = options.periodAbs || 0.01;

    /**
     * Grain period relative to absolute duration
     * @type {Number}
     */
    this.periodRel = options.periodRel || 0;

    /**
     * Amout of random grain period variation relative to grain period
     * @type {Number}
     */
    this.periodVar = options.periodVar || 0;

    /**
     * Grain position (onset time in audio buffer) in sec
     * @type {Number}
     */
    this.position = options.position || 0;

    /**
     * Amout of random grain position variation in sec
     * @type {Number}
     */
    this.positionVar = options.positionVar || 0.003;

    /**
     * Absolute grain duration in sec
     * @type {Number}
     */
    this.durationAbs = options.durationAbs || 0.1; // absolute grain duration

    /**
     * Grain duration relative to grain period (overlap)
     * @type {Number}
     */
    this.durationRel = options.durationRel || 0;

    /**
     * Absolute attack time in sec
     * @type {Number}
     */
    this.attackAbs = options.attackAbs || 0;

    /**
     * Attack time relative to grain duration
     * @type {Number}
     */
    this.attackRel = options.attackRel || 0.5;

    /**
     * Shape of attack
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.attackShape = options.attackShape || 'lin';

    /**
     * Absolute release time in sec
     * @type {Number}
     */
    this.releaseAbs = options.releaseAbs || 0;

    /**
     * Release time relative to grain duration
     * @type {Number}
     */
    this.releaseRel = options.releaseRel || 0.5;

    /**
     * Shape of release
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.releaseShape = options.releaseShape || 'lin';

    /**
     * Offset (start/end value) for exponential attack/release
     * @type {Number} offset
     */
    this.expRampOffset = options.expRampOffset || 0.0001;

    /**
     * Grain resampling in cent
     * @type {Number}
     */
    this.resampling = options.resampling || 0;

    /**
     * Amout of random resampling variation in cent
     * @type {Number}
     */
    this.resamplingVar = options.resamplingVar || 0;

    /**
     * Whether the grain position refers to the center of the grain (or the beginning)
     * @type {Bool}
     */
    this.centered = options.centered || true;

    /**
     * Whether the audio buffer and grain position are considered as cyclic
     * @type {Bool}
     */
    this.cyclic = options.cyclic || false;

    this.__gainNode = super$0.audioContext.createGain();
    this.__gainNode.gain.value = options.gain || 1;

    this.outputNode = this.__gainNode;
  }if(super$0!==null)SP$0(GranularEngine,super$0);GranularEngine.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":GranularEngine,"configurable":true,"writable":true}, bufferDuration: {"get": $bufferDuration_get$0, "configurable":true,"enumerable":true}, currentPosition: {"get": $currentPosition_get$0, "configurable":true,"enumerable":true}, playbackLength: {"get": $playbackLength_get$0, "configurable":true,"enumerable":true}, gain: {"get": $gain_get$0, "set": $gain_set$0, "configurable":true,"enumerable":true}});DP$0(GranularEngine,"prototype",{"configurable":false,"enumerable":false,"writable":false});

  function $bufferDuration_get$0() {
    var bufferDuration = this.buffer.duration;

    if (this.buffer.wrapAroundExtention)
      bufferDuration -= this.buffer.wrapAroundExtention;

    return bufferDuration;
  }

  // TimeEngine attribute
  function $currentPosition_get$0() {
    return this.position;
  }

  // TimeEngine method (scheduled interface)
  proto$0.advanceTime = function(time) {
    return time + this.trigger(time);
  };

  function $playbackLength_get$0() {
    return this.bufferDuration;
  }

  /**
   * Set gain
   * @param {Number} value linear gain factor
   */
  function $gain_set$0(value) {
    this.__gainNode.gain.value = value;
  }

  /**
   * Get gain
   * @return {Number} current gain
   */
  function $gain_get$0() {
    return this.__gainNode.gain.value;
  }

  /**
   * Trigger a grain
   * @param {Number} time grain synthesis audio time
   * @return {Number} period to next grain
   *
   * This function can be called at any time (whether the engine is scheduled or not)
   * to generate a single grain according to the current grain parameters.
   */
  proto$0.trigger = function(time) {var outputNode = arguments[1];if(outputNode === void 0)outputNode = this.outputNode;
    var audioContext = super$0.audioContext;
    var grainTime = time || audioContext.currentTime;
    var grainPeriod = this.periodAbs;
    var grainPosition = this.currentPosition;
    var grainDuration = this.durationAbs;

    if (this.buffer) {
      var resamplingRate = 1.0;

      // calculate resampling
      if (this.resampling !== 0 || this.resamplingVar > 0) {
        var randomResampling = (Math.random() - 0.5) * 2.0 * this.resamplingVar;
        resamplingRate = Math.pow(2.0, (this.resampling + randomResampling) / 1200.0);
      }

      grainPeriod += this.periodRel * grainDuration;
      grainDuration += this.durationRel * grainPeriod;

      // grain period randon variation
      if (this.periodVar > 0.0)
        grainPeriod += 2.0 * (Math.random() - 0.5) * this.periodVar * grainPeriod;

      // center grain
      if (this.centered)
        grainPosition -= 0.5 * grainDuration;

      // randomize grain position
      if (this.positionVar > 0)
        grainPosition += (2.0 * Math.random() - 1) * this.positionVar;

      var bufferDuration = this.bufferDuration;

      // wrap or clip grain position and duration into buffer duration
      if (grainPosition < 0 || grainPosition >= bufferDuration) {
        if (this.cyclic) {
          var cycles = grainPosition / bufferDuration;
          grainPosition = (cycles - Math.floor(cycles)) * bufferDuration;

          if (grainPosition + grainDuration > this.buffer.duration)
            grainDuration = this.buffer.duration - grainPosition;
        } else {
          if (grainPosition < 0) {
            grainTime -= grainPosition;
            grainDuration += grainPosition;
            grainPosition = 0;
          }

          if (grainPosition + grainDuration > bufferDuration)
            grainDuration = bufferDuration - grainPosition;
        }
      }

      // make grain
      if (this.gain > 0 && grainDuration >= 0.001) {
        // make grain envelope
        var envelopeNode = audioContext.createGain();
        var attack = this.attackAbs + this.attackRel * grainDuration;
        var release = this.releaseAbs + this.releaseRel * grainDuration;

        if (attack + release > grainDuration) {
          var factor = grainDuration / (attack + release);
          attack *= factor;
          release *= factor;
        }

        var attackEndTime = grainTime + attack;
        var grainEndTime = grainTime + grainDuration;
        var releaseStartTime = grainEndTime - release;

        if (this.attackShape === 'lin') {
          envelopeNode.gain.setValueAtTime(0.0, grainTime);
          envelopeNode.gain.linearRampToValueAtTime(1.0, attackEndTime);
        } else {
          envelopeNode.gain.setValueAtTime(this.expRampOffset, grainTime);
          envelopeNode.gain.exponentialRampToValueAtTime(1.0, attackEndTime);
        }

        if (releaseStartTime > attackEndTime)
          envelopeNode.gain.setValueAtTime(1.0, releaseStartTime);

        if (this.releaseShape === 'lin') {
          envelopeNode.gain.linearRampToValueAtTime(0.0, grainEndTime);
        } else {
          envelopeNode.gain.exponentialRampToValueAtTime(this.expRampOffset, grainEndTime);
        }

        envelopeNode.connect(outputNode);

        // make source
        var source = audioContext.createBufferSource();

        source.buffer = this.buffer;
        source.playbackRate.value = resamplingRate;
        source.connect(envelopeNode);

        source.start(grainTime, grainPosition);
        source.stop(grainTime + grainDuration / resamplingRate);
      }
    }

    return grainPeriod;
  };
MIXIN$0(GranularEngine.prototype,proto$0);proto$0=void 0;return GranularEngine;})(TimeEngine);

module.exports = GranularEngine;
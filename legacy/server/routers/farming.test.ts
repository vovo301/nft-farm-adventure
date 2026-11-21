import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateLuckModifier,
  selectRiskEvent,
  getRiskEventImpact,
  calculateFinalYield,
  RiskEvent,
} from "../farming";

describe("Farming Helpers", () => {
  describe("calculateLuckModifier", () => {
    it("should return a value between 0.85 and 1.15", () => {
      for (let i = 0; i < 100; i++) {
        const modifier = calculateLuckModifier();
        expect(modifier).toBeGreaterThanOrEqual(0.85);
        expect(modifier).toBeLessThanOrEqual(1.15);
      }
    });
  });

  describe("selectRiskEvent", () => {
    it("should return a valid RiskEvent", () => {
      const validEvents = [
        RiskEvent.PEST,
        RiskEvent.DROUGHT,
        RiskEvent.FLOOD,
        RiskEvent.DISEASE,
        RiskEvent.NONE,
      ];

      for (let i = 0; i < 100; i++) {
        const event = selectRiskEvent();
        expect(validEvents).toContain(event);
      }
    });

    it("should return NONE more frequently (70% chance)", () => {
      const events: RiskEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        events.push(selectRiskEvent());
      }

      const noneCount = events.filter((e) => e === RiskEvent.NONE).length;
      const nonePercentage = (noneCount / events.length) * 100;

      // Esperamos aproximadamente 70% (com margem de 10%)
      expect(nonePercentage).toBeGreaterThan(60);
      expect(nonePercentage).toBeLessThan(80);
    });
  });

  describe("getRiskEventImpact", () => {
    it("should return correct impact for each event", () => {
      expect(getRiskEventImpact(RiskEvent.NONE)).toBe(1.0);
      expect(getRiskEventImpact(RiskEvent.PEST)).toBe(0.7);
      expect(getRiskEventImpact(RiskEvent.DROUGHT)).toBe(0.8);
      expect(getRiskEventImpact(RiskEvent.FLOOD)).toBe(0.75);
      expect(getRiskEventImpact(RiskEvent.DISEASE)).toBe(0.65);
    });
  });

  describe("calculateFinalYield", () => {
    it("should calculate yield with no risk event", () => {
      const baseYield = 10;
      const luckModifier = 1.0;
      const riskEvent = RiskEvent.NONE;

      const finalYield = calculateFinalYield(baseYield, luckModifier, riskEvent);
      expect(finalYield).toBe(10);
    });

    it("should reduce yield with pest event", () => {
      const baseYield = 10;
      const luckModifier = 1.0;
      const riskEvent = RiskEvent.PEST;

      const finalYield = calculateFinalYield(baseYield, luckModifier, riskEvent);
      expect(finalYield).toBe(7); // 10 * 1.0 * 0.7
    });

    it("should apply luck modifier", () => {
      const baseYield = 10;
      const luckModifier = 1.1;
      const riskEvent = RiskEvent.NONE;

      const finalYield = calculateFinalYield(baseYield, luckModifier, riskEvent);
      expect(finalYield).toBe(11); // 10 * 1.1 * 1.0
    });

    it("should apply both luck and risk", () => {
      const baseYield = 10;
      const luckModifier = 1.1;
      const riskEvent = RiskEvent.DROUGHT;

      const finalYield = calculateFinalYield(baseYield, luckModifier, riskEvent);
      expect(finalYield).toBe(8); // Math.floor(10 * 1.1 * 0.8)
    });

    it("should return minimum of 1", () => {
      const baseYield = 1;
      const luckModifier = 0.85;
      const riskEvent = RiskEvent.DISEASE;

      const finalYield = calculateFinalYield(baseYield, luckModifier, riskEvent);
      expect(finalYield).toBeGreaterThanOrEqual(1);
    });
  });
});

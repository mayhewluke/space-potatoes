import { restoreRAF, step, useMockRAF } from "../../test/mockRAF";
import {
  fromAnimationFrame,
  fromDOMEvent,
  mapEvt,
  merge,
  mkEvent,
} from "./Event";

describe("Event", () => {
  describe("fromAnimationFrame", () => {
    beforeEach(() => useMockRAF());
    afterEach(() => restoreRAF());

    it("emits the delta since the last animation frame", () => {
      const event = fromAnimationFrame();
      const sub = jest.fn();
      const delta = 1337;

      event.subscribe(sub);
      step();
      step(1, delta);

      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub).toHaveBeenCalledWith(delta);
    });
  });

  describe("fromDOMEvent", () => {
    it("emits whenever the DOM event for the element fires", () => {
      const ele = document.createElement("button");
      const event = fromDOMEvent(ele, "click");
      const sub = jest.fn();
      const domEvent = new Event("click");
      event.subscribe(sub);

      ele.dispatchEvent(domEvent);
      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub).toHaveBeenLastCalledWith(domEvent);

      // Check that it doesn't emit for other event types.
      ele.dispatchEvent(new Event("keydown"));
      expect(sub).toHaveBeenCalledTimes(1);
    });
  });

  describe("map", () => {
    it("maps each event using the map function", () => {
      const transform = (val: string) => val.toUpperCase();
      const inputs = ["Hello World!", "Space potatoes is the best!"];
      // Make sure the transform function does make a difference, to avoid false
      // positives.
      expect(inputs.map(transform)).not.toEqual(inputs);
      const outputs: string[] = [];
      const [event, emit] = mkEvent<string>();
      mapEvt(transform)(event).subscribe(val => outputs.push(val));

      inputs.forEach(emit);
      expect(outputs).toEqual(inputs.map(transform));
    });

    it("runs the transform once per event, regardless of number of subscribers", () => {
      const transform = jest.fn();
      const [event, emit] = mkEvent();

      const mappedEvent = mapEvt(transform)(event);
      mappedEvent.subscribe(() => null);
      mappedEvent.subscribe(() => null);
      expect(transform).not.toHaveBeenCalled();

      emit({});
      expect(transform).toHaveBeenCalledTimes(1);
    });
  });

  describe("merge", () => {
    it("emits whenever any of the source events emit", () => {
      const sources = [mkEvent<number>(), mkEvent<number>(), mkEvent<number>()];
      const expected = [0, 2, 1];
      const outputs: number[] = [];
      const merged = merge(...sources.map(([event, _]) => event));
      merged.subscribe(val => outputs.push(val));

      // sources[any][1] === emit for that source
      expected.forEach(n => sources[n][1](n));

      expect(outputs).toEqual(expected);
    });
  });
});
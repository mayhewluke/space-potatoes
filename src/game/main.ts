import { fromAnimationFrame } from "../frp";
import {
  drawPoint,
  Transforms,
  withContext,
  wrapOutOfBounds,
} from "../graphics/Geometry";
import { registerForKeyEvents } from "./keyboard";
import {
  drawShip,
  Ship,
  updateAngle,
  updatePos,
  updateShip,
  updateVel,
} from "./Ship";

const drawBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export default (ctx: CanvasRenderingContext2D) => {
  const starterShip: Ship = {
    angle: (-90 / 180) * Math.PI,
    pos: [ctx.canvas.width / 2, ctx.canvas.height / 2],
    scale: [3, 3],
    thrustPower: 0,
    vel: [0, 0],
  };

  const fpsDelta = fromAnimationFrame();
  const keysPressed = registerForKeyEvents();

  const dynShip = updateShip(
    fpsDelta,
    keysPressed,
    starterShip,
    updateAngle(180 / 1000),
    updateVel(0.25 / 1000),
    updatePos,
    () => wrapOutOfBounds([ctx.canvas.width, ctx.canvas.height]),
  );

  const render = (ship: Ship) => {
    drawBackground(ctx);
    const shipRelative: Transforms = {
      angle: ship.angle,
      scale: ship.scale,
      translate: ship.pos,
    };
    withContext(ctx, shipRelative)(drawShip(ship.thrustPower));
    withContext(ctx, shipRelative)(drawPoint("red"));
  };

  dynShip.subscribe(render);
};

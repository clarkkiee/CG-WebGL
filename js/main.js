"use strict";

import { vs, fs } from "./shader.js";
import { decodeMTL, decodeOBJ } from "../helpers/parse.js";
import { aggregateGeometryExtents, radiansFromDegrees } from "../helpers/utils.js";

const fetchOBJData = async (url) => decodeOBJ(await fetch(url).then((r) => r.text()));

const fetchMaterialData = async (libs, base) => {
  const matData = await Promise.all(
    libs.map((lib) => fetch(new URL(lib, base)).then((r) => r.text())));
  return decodeMTL(matData.join("\n"));
};

  const generatePartsForRendering = (gl, obj, materials) =>
    obj.geometries.map(({ material, data }) => ({
      material: materials[material],
      bufferInfo: webglUtils.createBufferInfoFromArrays(gl, {
        ...data,
        color: data.color?.length === data.position.length ? { numComp: 3, data: data.color } : { value: [1, 1, 1, 1] },
      }),
    }));

  const configureCamera = ({ min, max }) => {
    const dimensions = m4.subtractVectors(max, min);
    const midpoint = m4.addVectors(min, m4.scaleVector(dimensions, 0.5));
    const distance = m4.length(dimensions) * 1.0;
    const camPos = m4.addVectors([0, 0, 0], [0, 0, distance]);
    return { objOffset: m4.scaleVector(midpoint, -1), camPos: camPos, camTarget: [0, 0, 0], zNear: distance / 100, zFar: distance * 3, };
  };
  
  const initializeEventListeners = () => {
    let freeze = false;
    const actions = {
      32: () => (freeze = !freeze), 
      click: () => (freeze = !freeze),
    };
    const handleEvent = (event) => {
      if (actions[event.type]) actions[event.type](event);
      if (event.keyCode === 32) actions[32](event); // Handle space key specifically
    };
    document.addEventListener("keydown", handleEvent);
    document.addEventListener("keyup", handleEvent);
    document.addEventListener("click", handleEvent);
    return () => freeze;
  };
  

// Main function to initialize WebGL rendering
const initializeWebGLRendering = async () => {
  const gl = document.querySelector("canvas").getContext("webgl"); if (!gl) return;
  const obj = await fetchOBJData("./js/koper-fix.obj");
  const materials = await fetchMaterialData(
    obj.materialLibs,
    new URL("./js/koper-fix.obj", window.location.href)
  );
  const parts = generatePartsForRendering(gl, obj, materials);
  const { objOffset, camPos, camTarget, zNear, zFar } = configureCamera(aggregateGeometryExtents(obj.geometries));
  const freeze = initializeEventListeners();

  let totalElapsedTime = 0, prevTime = 0;
  const meshProg = webglUtils.createProgramInfo(gl, [vs, fs]);

  const render = (timeNow) => {
    timeNow *= 0.0004;
    const delta = timeNow - prevTime;
    prevTime = timeNow;

    if (freeze() === false) totalElapsedTime += delta;
    const resizeAndSetup = (canvas, gl) => {
      webglUtils.resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
    };
  
    resizeAndSetup(gl.canvas, gl);

    const fov = radiansFromDegrees(60), aspect = gl.canvas.clientWidth / gl.canvas.clientHeight

    const lightDir = m4.normalize([-0.5, 0.5, 1]);
    const ambientLight = [0.1, 0.1, 0.1];
    const viewWorldPos = camPos;
    const view = m4.inverse(m4.lookAt(camPos, camTarget, [0, 1, 0]));
    const viewMatrix = view;
    const proj = m4.perspective(fov, aspect, zNear, zFar);
    const projMat = proj;
    
    const shaderUniforms = {
      u_viewWorldPosition: viewWorldPos,
      u_view: viewMatrix,
      u_proj: projMat,
      u_ambientLight: ambientLight,
      u_lightDir: lightDir
    };

    gl.useProgram(meshProg.program);
    webglUtils.setUniforms(meshProg, shaderUniforms);

    let worldMatrix = m4.yRotation(totalElapsedTime);
    worldMatrix = m4.xRotate(worldMatrix, radiansFromDegrees(-360));
    worldMatrix = m4.translate(worldMatrix, ...objOffset);

    parts.forEach(({ bufferInfo, material }) => {
      webglUtils.setBuffersAndAttributes(gl, meshProg, bufferInfo);
      webglUtils.setUniforms(meshProg, { u_world: worldMatrix }, material);
      webglUtils.drawBufferInfo(gl, bufferInfo);
    });
    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
};

initializeWebGLRendering();


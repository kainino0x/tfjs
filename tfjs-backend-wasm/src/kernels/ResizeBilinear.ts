/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {NamedAttrMap, NamedTensorInfoMap, registerKernel, TensorInfo, util} from '@tensorflow/tfjs-core';

import {BackendWasm} from '../backend_wasm';

interface ResizeBilinearInputs extends NamedTensorInfoMap {
  x: TensorInfo;
}

interface ResizeBilinearAttrs extends NamedAttrMap {
  newWidth: number;
  newHeight: number;
  alignCorners: boolean;
}

let wasmResizeBilinear: (
    xId: number, batch: number, oldHeight: number, oldWidth: number,
    numChannels: number, newHeight: number, newWidth: number,
    alignCorners: number, outId: number) => void;

function setup(backend: BackendWasm): void {
  wasmResizeBilinear = backend.wasm.cwrap('ResizeBilinear', null /*void*/, [
    'number',  // xId
    'number',  // batch
    'number',  // oldHeight
    'number',  // oldWidth
    'number',  // numChannels
    'number',  // newHeight
    'number',  // newWidth
    'number',  // alignCorners
    'number'   // outId
  ]);
}

function cropAndResize(args: {
  backend: BackendWasm,
  inputs: ResizeBilinearInputs,
  attrs: ResizeBilinearAttrs
}): TensorInfo {
  const {backend, inputs, attrs} = args;
  const {x} = inputs;
  const {alignCorners, newHeight, newWidth} = attrs;

  const [batch, oldHeight, oldWidth, numChannels] = x.shape;
  const outShape = [batch, newHeight, newWidth, numChannels];

  const xId = backend.dataIdMap.get(x.dataId).id;

  const out = backend.makeOutput(outShape, x.dtype);
  if (util.sizeFromShape(x.shape) === 0) {
    return out;
  }
  const outId = backend.dataIdMap.get(out.dataId).id;

  wasmResizeBilinear(
      xId, batch, oldHeight, oldWidth, numChannels, newHeight, newWidth,
      alignCorners ? 1 : 0, outId);
  return out;
}

registerKernel({
  kernelName: 'ResizeBilinear',
  backendName: 'wasm',
  setupFunc: setup,
  kernelFunc: cropAndResize
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { Input } from './input';

test('two separate fingers can hold a direction and press jump, with independent release',()=>{
  const browser=new Window();
  Object.assign(globalThis,{window:browser,document:browser.document});
  browser.document.body.innerHTML='<button data-control="left"></button><button data-control="right"></button><button data-control="jump"></button>';
  const buttons=browser.document.querySelectorAll('button');
  buttons.forEach(b=>{b.setPointerCapture=()=>{};});
  const input=new Input();input.enabled=true;
  buttons[1].dispatchEvent(new browser.PointerEvent('pointerdown',{pointerId:7}));
  buttons[2].dispatchEvent(new browser.PointerEvent('pointerdown',{pointerId:9}));
  assert.deepEqual(input.read(),{direction:1,jump:true,shoot:false});
  assert.deepEqual(input.read(),{direction:1,jump:false,shoot:false});
  buttons[2].dispatchEvent(new browser.PointerEvent('pointerup',{pointerId:9}));
  assert.deepEqual(input.read(),{direction:1,jump:false,shoot:false});
  buttons[1].dispatchEvent(new browser.PointerEvent('pointercancel',{pointerId:7}));
  assert.deepEqual(input.read(),{direction:0,jump:false,shoot:false});
  buttons[0].dispatchEvent(new browser.PointerEvent('pointerdown',{pointerId:10}));
  browser.dispatchEvent(new browser.Event('blur'));
  assert.deepEqual(input.read(),{direction:0,jump:false,shoot:false});
});

test('keyboard arrow plus Space combines, and a held Space cannot auto-repeat jumps',()=>{
  const browser=new Window();Object.assign(globalThis,{window:browser,document:browser.document});
  const input=new Input();input.enabled=true;
  browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code:'ArrowLeft'}));
  browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code:'Space'}));
  assert.deepEqual(input.read(),{direction:-1,jump:true,shoot:false});
  browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code:'Space',repeat:true}));
  assert.deepEqual(input.read(),{direction:-1,jump:false,shoot:false});
  browser.dispatchEvent(new browser.KeyboardEvent('keyup',{code:'ArrowLeft'}));
  assert.deepEqual(input.read(),{direction:0,jump:false,shoot:false});
  input.enabled=false;browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code:'ArrowRight'}));
  assert.deepEqual(input.read(),{direction:0,jump:false,shoot:false});
});
test('Ctrl shoots while moving and jumping; either Ctrl key works independently',()=>{
  const browser=new Window();Object.assign(globalThis,{window:browser,document:browser.document});const input=new Input();input.enabled=true;
  for(const code of ['ArrowRight','Space','ControlLeft','ControlRight'])browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code}));
  assert.deepEqual(input.read(),{direction:1,jump:true,shoot:true});
  browser.dispatchEvent(new browser.KeyboardEvent('keyup',{code:'ControlLeft'}));assert.equal(input.read().shoot,true);
  browser.dispatchEvent(new browser.KeyboardEvent('keyup',{code:'ControlRight'}));assert.equal(input.read().shoot,false);
});
test('touch movement, jump and rainbow shot can be held by separate fingers',()=>{
  const browser=new Window();Object.assign(globalThis,{window:browser,document:browser.document});
  browser.document.body.innerHTML='<button data-control="right"></button><button data-control="jump"></button><button data-control="shoot"></button>';
  const buttons=browser.document.querySelectorAll('button');buttons.forEach(b=>b.setPointerCapture=()=>{});
  const input=new Input();input.enabled=true;buttons.forEach((b,i)=>b.dispatchEvent(new browser.PointerEvent('pointerdown',{pointerId:i+1})));
  assert.deepEqual(input.read(),{direction:1,jump:true,shoot:true});
  buttons[1].dispatchEvent(new browser.PointerEvent('pointerup',{pointerId:2}));assert.deepEqual(input.read(),{direction:1,jump:false,shoot:true});
  browser.dispatchEvent(new browser.Event('blur'));assert.deepEqual(input.read(),{direction:0,jump:false,shoot:false});
});

# wasm-glue
**Get println! & panics to work in WebAssembly**

WebAssembly is cool and all, but Rust `println!`'s don't work out of the box, and when it crashes you're left with that unhelpful "unreachable" error in the stack trace instead of it telling you what actually went wrong.

`wasm-glue` is glue code to hook up your stdout and stderr.

👉 [Live Example](https://demille.github.io/wasm-glue/example/)

<br/>


## Usage
Most basic usage, call `wasm_glue::hook()` once, near the start of whatever you are doing:

```rust
extern crate wasm_glue;

#[no_mangle]
pub fn run_webassembly() {
    // hook stdout and stderr up once, before printing anything
    wasm_glue::hook();

    println!("hello console!");
    println!("I'm gunna crash:");

    None::<Option<u32>>.unwrap();
}
```

**Coordinating JavaScript:**
You'll need 3 imported JavaScript functions for this to work: `print`, `eprint`, and `trace`:

```rust
extern {
    fn print(ptr: *const c_char);  // for stdout
    fn eprint(ptr: *const c_char); // for stderr
    fn trace(ptr: *const c_char);  // specifically for panics
}
```

A basic implementation of these functions would look like this:

```js
// keep a WebAssembly memory reference for `readString`
let memory;

// read a null terminated c string at a wasm memory buffer index
function readString(ptr) {
  const view = new Uint8Array(memory.buffer);

  let end = ptr;
  while (view[end]) ++end;

  const buf = new Uint8Array(view.subarray(ptr, end));
  return (new TextDecoder()).decode(buf);
}

// `wasm_glue::hook()` requires all three
const imports = {
  env: {
    print(ptr) {
      console.log(readString(ptr));
    },

    eprint(ptr) {
      console.warn(readString(ptr));
    },

    trace(ptr) {
      throw new Error(readString(ptr));
    },
  },
};

// ...

WebAssembly.instantiate(buffer, imports).then((result) => {
    const exports = result.instance.exports;

    // update memory reference for readString()
    memory = exports.memory;
    exports.run_webassembly();

    // ...
})
```

:boom: Boom! Fully working `println!`'s and helpful panics.

See a complete example of this in the `/example` folder.

_**Extra Credit:**_ demangle your stack traces.  
You can copy the [implementation here][demangle] to demangle the `.stack` property of the error you generate inside your `trace` function. Helps make debugging a little more readable.

[demangle]: https://github.com/DeMille/wasm-ffi/blob/master/src/demangle.js

<br/>


## What's happening?

`wasm-glue` uses somewhat obscure std library functions:
- `std::io::set_print()`
- `std::io::set_panic()`
- `std::panic::set_hook()`

Check `lib.rs` to see what's going on.

<br/>


## Options

`wasm_glue::hook()` calls all 3 of those magic functions. But you can pick and choose if you'd rather. You can also set stdout / stderr to unbuffered instead of line buffered (the default).

&bullet; **::set_stdout()**  
&bullet; **::set_stdout_unbuffered()**  
&bullet; **::set_stderr()**  
&bullet; **::set_stderr_unbuffered()**  
&bullet; **::set_panic_hook()**  

Alternatively, you can just use the macros for `print!` / `eprint`:

```rust
#[macro_use]
extern crate wasm_glue;
```
<br/>


## License
MIT
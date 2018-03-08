// keep a WebAssembly memory reference for `readString`
let memory;

// read a null terminated c string at a wasm memory buffer index
function readString(ptr) {
  const view = new Uint8Array(memory.buffer);

  // find the end of the string (null)
  let end = ptr;
  while (view[end]) ++end;

  // `subarray` uses the same underlying ArrayBuffer as the view
  const buf = new Uint8Array(view.subarray(ptr, end));
  const str = (new TextDecoder()).decode(buf); // (utf-8 by default)

  return str;
}

// necessary imports under the `env` namespace (rust looks for exports here)
//
// `wasm_glue::hook()` requires all three
const imports = {
  env: {
    // needed for `wasm_glue::set_stdout()` or `#[macro_use(print)]`
    print(ptr) {
      // sidenote: this doesn't have to be a console.log(). You could put
      // this up in the html too if you wanted.
      console.log(readString(ptr));
    },

    // needed for `wasm_glue::set_stderr()` or `#[macro_use(eprint)]`
    eprint(ptr) {
      console.warn(readString(ptr));
    },

    // needed for `wasm_glue::set_panic_hook()`
    trace(ptr) {
      const err = new Error(readString(ptr));
      // here is where you could demangle the stack trace with:
      // https://github.com/demille/wasm-ffi/blob/master/src/demangle.js
      throw err;
    },
  },
};

// fetch and instantiate the wasm module
fetch('example.wasm')
  .then(response => response.arrayBuffer())
  .then(buffer => WebAssembly.instantiate(buffer, imports))
  .then((result) => {
    console.log('wasm loaded!: ', result);
    const exports = result.instance.exports;

    // update memory reference for readString
    memory = exports.memory;

    // wasm_glue::hook() need to be called before anything that will print
    exports.hook();

    // wasm calls: imports.env.print()
    exports.print_add(2, 2);

    // wasm calls: imports.env.eprint()
    exports.print_err_msg();

    // wasm panic will trigger: imports.env.trace()
    exports.cause_panic();
  })
  .catch(err => setTimeout(() => { throw err; }));

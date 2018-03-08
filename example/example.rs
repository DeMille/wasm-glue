extern crate wasm_glue;

#[no_mangle]
pub fn hook() {
    wasm_glue::hook();
}

#[no_mangle]
pub fn print_add(a: u32, b: u32) {
    println!("{} + {} = {}", a, b, a + b);
}

#[no_mangle]
pub fn print_err_msg() {
    eprintln!(r"Danger! Danger! /!\");
}

#[no_mangle]
pub fn cause_panic() {
    None::<Option<u32>>.unwrap();
}

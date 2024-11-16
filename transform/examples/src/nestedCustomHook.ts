import { customHook } from "./customHook";

function nestedCustomHook() {
    // do some stuff
    const value = customHook();
}

function system() {
    nestedCustomHook();
}
import { customHook } from "./customHook";
import { nestedCustomHook } from "./nestedCustomHook";

function testSystem() {
    const value_1 = customHook();
    const value_2 = nestedCustomHook();
}


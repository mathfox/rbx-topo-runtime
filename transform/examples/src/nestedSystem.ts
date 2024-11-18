import { useHookState } from "./useHookState";

interface Storage {
    value: unknown
}

function useState() {
    const storage = useHookState() as Storage

    return [storage, (newValue: unknown) => {
        storage.value = newValue
    }]
}

function sub_system_1(): void {
    const [value, setValue] = useState();
}

function sub_system_2(): void {
    const [value, setValue] = useState();
}

function sub_system_3(): void {
    // both of the scoped should have it's own unique storage (therefore key)
    (() => {
            const [value, setValue] = useState();
    })();

    (() => {
            const [value, setValue] = useState();
    })();
}

function sub_system_4(): void {
    // both of the scoped should have it's own unique storage (therefore key)
    (function test(){
            const [value, setValue] = useState();
    })();

    (function test(){
            const [value, setValue] = useState();
    })();
}

function nestedSystem(): void {
    sub_system_1();
    sub_system_2();
    sub_system_3();
    sub_system_4();
}
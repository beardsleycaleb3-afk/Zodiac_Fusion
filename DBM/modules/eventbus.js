// Zodiac_Fusion: EventBus 10:01
export const EventBus = {
    _events: {},
    emit(event, data) {
        if (!this._events[event]) return;
        // Palindrome Mirror: Node A -> Node B
        this._events[event].forEach(callback => callback(data));
    },
    on(event, callback) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(callback);
    }
};

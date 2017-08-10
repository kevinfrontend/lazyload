import defaultSettings from "./lazyload.defaults";
import {
    isBot,
    callCallback
} from "./lazyload.utils";
import autoInitialize from "./lazyload.autoInitialize";
import setSources from "./lazyload.setSources";

/*
 * Constructor
 */

const LazyLoad = function (instanceSettings) {
    this._settings = Object.assign({}, defaultSettings, instanceSettings);
    this._intObsSupport = ("IntersectionObserver" in window);
    const settings = this._settings;
    if (this._intObsSupport) {
        const onIntersection = (entries) => {
            // Loop through the entries
            entries.forEach(entry => {
                // Is the image in viewport?
                if (entry.intersectionRatio > 0) {
                    let element = entry.target;
                    this._revealElement(element);
                    this._observer.unobserve(element);
                }
            });
        };
        this._observer = new IntersectionObserver(onIntersection, {
            root: settings.container === document ? null : settings.container,
            rootMargin: this._settings.threshold + "px"
        });
    }
    this.update();
};

// TODO: Convert settings = this._settings into {setting1, setting2} = this._settings for legibility and minification;

LazyLoad.prototype = {

    /*
     * Private methods
     */

    _onError: function (event) {
        const settings = this._settings;
        const element = event.target;
        if (!settings) {
            return; // As this method is asynchronous, it must be protected against calls after destroy()
        }
        element.removeEventListener("load", this._onLoad);
        element.removeEventListener("error", this._onError);
        element.classList.remove(settings.class_loading);
        element.classList.add(settings.class_error);
        callCallback(settings.callback_error, element);
    },

    _onLoad: function (event) {
        const settings = this._settings;
        const element = event.target;
        if (!settings) {
            return; // As this method is asynchronous, it must be protected against calls after destroy()
        }
        element.classList.remove(settings.class_loading);
        element.classList.add(settings.class_loaded);
        element.removeEventListener("load", this._onLoad);
        element.removeEventListener("error", this._onError);
        /* Calling LOAD callback */
        callCallback(settings.callback_load, element);
    },

    // Stop watching and load the image
    _revealElement: function (element) {
        const settings = this._settings;
        if (["IMG", "IFRAME"].indexOf(element.tagName) > -1) {
            element.addEventListener("load", this._onLoad.bind(this));
            element.addEventListener("error", this._onError.bind(this));
            element.classList.add(settings.class_loading);
        }
        setSources(element, settings);
        element.dataset.wasProcessed = true;
        callCallback(settings.callback_set, element);
    },

    // TODO: Optimize removing double loop (for, while) -- can this function be removed at all?
    _purgeElements: function () {
        const elements = this._elements,
            elementsLength = elements.length,
            elementsToPurge = [];

        for (let i = 0; i < elementsLength; i++) {
            let element = elements[i];
            /* If the element has already been processed, skip it */
            if (element.dataset.wasProcessed) {
                elementsToPurge.push(i);
            }
        }
        /* Removing elements to purge from this._elements. */
        while (elementsToPurge.length > 0) {
            elements.splice(elementsToPurge.pop(), 1);
        }
    },

    /* 
     * Public methods
     */

    update: function () {
        const settings = this._settings;

        // TODO: Don't convert to array, use nodeset directly
        // TODO: Make purgeElements take a nodeset and return a purged one so this._elements is assigned once

        // Converts to array the nodeset obtained querying the DOM from settings.container with elements_selector
        this._elements = Array.prototype.slice.call(settings.container.querySelectorAll(settings.elements_selector));
        this._purgeElements();

        if (this._observer) {
            this._elements.forEach(element => {
                this._observer.observe(element);
            });
            return;
        }

        if (settings.observer_fallback === 1) {
            this._elements.forEach(element => {
                this._revealElement(element, settings);
            });
        }

    },

    destroy: function () {
        if (this._observer) {
            this._purgeElements();
            this._elements.forEach(element => {
                this._observer.unobserve(element);
            });
            this._observer = null;
        }
        this._elements = null;
        this._settings = null;
        this._intObsSupport = null;
    }
}

/* Automatic instances creation if required (useful for async script loading!) */
let autoInitOptions = window.lazyLoadOptions;
if (autoInitOptions) {
    autoInitialize(LazyLoad, autoInitOptions);
}

export default LazyLoad;
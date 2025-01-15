// shim for node.js, returning a class that provides Helios' Program interface
// ... plus caching

export { 
    CachedHeliosProgramFS as HeliosProgramWithCacheAPI 
} from "./CachedHeliosProgramFS.js";




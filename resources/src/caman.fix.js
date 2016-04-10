// Hack fix for Caman issue
// See https://github.com/meltingice/CamanJS/issues/158 for details
Caman.IO.domainRegex =  /(?:(?:http|https):\/\/)((?:[a-zA-Z0-9_-]+)\.(?:(?:[a-zA-Z0-9_-]*|\.)+))/;

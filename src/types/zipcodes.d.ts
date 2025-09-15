declare module "zipcodes" {
  export interface ZipInfo {
    zip: string;
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  }

  const zipcodes: {
    lookup(zip: string | number): ZipInfo | null;
  };

  export default zipcodes;
}
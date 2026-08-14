"use client";

import { useState, useEffect, useMemo } from "react";
import { Country, State, City } from "country-state-city";

/**
 * Shared cascading Country → State → City selector.
 * Used by both the checkout shipping step and the account address book.
 *
 * Stores ISO codes (e.g. "US", "CA-ON") so /lib/tax.ts and /lib/shipping.ts
 * match reliably instead of drifting on display-name typos.
 */

interface CountryStateCitySelectProps {
  country: string; // ISO2 code e.g. "US"
  state: string; // ISO code e.g. "NY" or display name if no states
  city: string;
  onCountryChange: (code: string) => void;
  onStateChange: (code: string) => void;
  onCityChange: (name: string) => void;
  inputClassName?: string;
  labelClassName?: string;
}

export function CountryStateCitySelect({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  inputClassName = "w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 transition-colors bg-transparent",
  labelClassName = "block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1",
}: CountryStateCitySelectProps) {
  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const states = useMemo(() => {
    if (!country) return [];
    return State.getStatesOfCountry(country);
  }, [country]);

  const cities = useMemo(() => {
    if (!country || !state) return [];
    return City.getCitiesOfState(country, state);
  }, [country, state]);

  const hasStates = states.length > 0;
  const hasCities = cities.length > 0;

  // When country changes, reset state and city
  const handleCountryChange = (newCountry: string) => {
    onCountryChange(newCountry);
    onStateChange("");
    onCityChange("");
  };

  // When state changes, reset city
  const handleStateChange = (newState: string) => {
    onStateChange(newState);
    onCityChange("");
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Country */}
      <div>
        <label className={labelClassName}>Country</label>
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select country</option>
          {/* Prioritize common countries at top */}
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option disabled>──────────</option>
          {allCountries
            .filter((c) => !["US", "CA", "GB"].includes(c.isoCode))
            .map((c) => (
              <option key={c.isoCode} value={c.isoCode}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {/* State / Region */}
      <div>
        <label className={labelClassName}>State / Province / Region</label>
        {hasStates ? (
          <select
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            className={inputClassName}
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          /* Graceful fallback: free-text input when no states in data */
          <input
            type="text"
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            placeholder="Region"
            className={inputClassName}
          />
        )}
      </div>

      {/* City */}
      <div>
        <label className={labelClassName}>City</label>
        {hasCities ? (
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className={inputClassName}
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={`${c.name}-${c.stateCode}`} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          /* Free-text when no city data — never block checkout on data gap */
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            className={inputClassName}
          />
        )}
      </div>
    </div>
  );
}

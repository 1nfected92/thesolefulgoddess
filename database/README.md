# Booking demo database

`availability.json` is the read-only mock availability source consumed by booking.js. Each date lists open start times in America/Chicago. Four available times = green, three = yellow, two = gold, one = orange, zero = red. Past dates and elapsed times cannot be booked. The finite mock dataset ends March 3, 2028; later dates are unavailable until extended.

`bookings.json` is an empty portable database template. The working demo saves reservations in browser localStorage (`solefulBookingsV1`). Export database JSON downloads this same structure containing the device’s reservations. The public repository file is never modified by visitors. Reservations can be cancelled; their slot becomes available again locally. Tabs on the same origin receive storage updates. This is not cross-device synchronization or a production appointment service.

Never commit actual customer data or credentials to this public repository. Production use requires a private server/database, authentication, transactional slot locking, abuse prevention and notification delivery. `schema.sql` is a starter schema only; it is not connected to this demo.

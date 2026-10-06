# How Operators Know What Is Happening

People in a grid control room cannot see power directly. They rely on digital meters.

### Real State vs Reported Data

There is a big difference between truth and reports:

- **Real State:** The real electrical state on the wire.
- **Reported Data:** What the meter sends back to the control room.

In quiet times, reports match reality. But if a meter fails or someone alters the data, the control room sees a lie.

Mathematical state estimation checks if all incoming reports fit together cleanly.

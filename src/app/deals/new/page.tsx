"use client";

import { useActionState } from "react";
import { createDealAction, NewDealState } from "./action";


export default function NewDealPage() {
  const [state, formAction, pending] = useActionState<NewDealState, FormData>(createDealAction, {});

  return (
    <div className="card">
      <h1>New deal</h1>
      <p className="muted">Paste the brand's email. Dealflow reads the price, deliverables and payment terms.</p>
      <form action={formAction}>
        <textarea name="email" rows={12} defaultValue={state.email} placeholder="Hi! We'd love a sponsored video..." required />
        {state.error && <p className="error">{state.error}</p>}
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Reading email..." : "Extract deal"}
          </button>
        </p>
      </form>
    </div>
  );
}
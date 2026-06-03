import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="border-4 border-white shadow-[12px_12px_0_0_#00FFFF] bg-white p-4 max-w-md w-full flex justify-center">
        <SignUp 
            appearance={{
                elements: {
                    card: "shadow-none bg-transparent",
                    headerTitle: "font-extrabold uppercase text-black text-2xl",
                    headerSubtitle: "text-black font-bold",
                    formButtonPrimary: "bg-piyak-selection text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] rounded-none uppercase font-extrabold transition-all",
                    formFieldInput: "border-4 border-black rounded-none p-3 font-bold bg-white text-black focus:ring-4 focus:ring-piyak-selection outline-none",
                    formFieldLabel: "uppercase font-extrabold text-black",
                    footerActionLink: "text-piyak-selection font-extrabold hover:underline",
                }
            }}
        />
      </div>
    </div>
  );
}

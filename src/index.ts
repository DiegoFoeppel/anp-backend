import app from "./server";

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => console.log(`server running at port ${PORT}`));

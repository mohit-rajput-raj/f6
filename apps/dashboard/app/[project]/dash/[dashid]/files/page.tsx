"use client";


// import ProjectList from
const Files = () => {
  // const [file, setFile] = React.useState<File | null>(null);
  // const [resdata, setRes] = React.useState<any[]>([]);


  // const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFile(e.target.files?.[0] || null);
  // };
  // const onUpload = async () => {
  //   if (!file) {
  //     alert("Please select a file first!");
  //     return;
  //   }

  //   const form = new FormData();
  //   form.append("file", file);

  //   const res = await api.post("/process-csv-json", form, {
  //     headers: {
  //       "Content-Type": "multipart/form-data",
  //     },
  //   });

  //   setRes(res.data);

  // };

  // const hello = async () => {
  //   const res = await api.get("/");
  // };

  return (
    <div>
      files
      {/* <ProjectList/> */}
      {/* <h1>CSV Upload</h1>

      <input type="file" onChange={onFileChange} />
      <Button onClick={hello}>hello</Button> */}
      {/* <button onClick={onUpload}>Upload</button> */}
      {/* <Team /> */}
      {/* <div className="p-3 w-full h-full overflow-auto">
        <ProjectList data={resdata} />
      </div> */}
    </div>
  );
};

export default Files;

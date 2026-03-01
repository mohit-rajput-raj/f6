import z from "zod";

export const CreateWorkFlowFormSchema = z.object({
  name: z.string().min(2,{ message: "atleast 2 characters" }).max(20 , {message:"atmost 20 characters require"}),

 
});
export  type CreateWorkFlowFormProps = z.infer<typeof CreateWorkFlowFormSchema>;
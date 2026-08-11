import "server-only";

import { plotRepository } from "@/repositories/plot.repository";
import { projectService } from "@/services/project.service";
import { auditLogService } from "@/services/audit-log.service";
import type { PlotInput } from "@/validators/plot.validators";

export const plotService = {
  async getPlot(customerId: string, projectId: string) {
    // Ownership check — throws NotFoundError if the project doesn't exist or isn't
    // this customer's, before we touch the plot table at all.
    await projectService.getProject(customerId, projectId);
    return plotRepository.findByProjectId(projectId);
  },

  async savePlot(customerId: string, projectId: string, input: PlotInput, request?: Request) {
    await projectService.getProject(customerId, projectId);
    const plot = await plotRepository.upsert(projectId, input);

    await auditLogService.log("PLOT_SAVED", {
      userId: customerId,
      entityType: "Plot",
      entityId: plot.id,
      request,
    });

    return plot;
  },
};

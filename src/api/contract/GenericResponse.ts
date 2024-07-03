import {Response} from "express";

export interface GenericResponseStructure<T> {
    status: number;
    message?: string;
    data?: T;
}

const of = <T>(res: Response, status: number, message: string | null, data: T | null): Response<T> => {
    return res.status(status).json({status, message, data});
}

const ofStatus = <T>(res: Response, status: number): Response<T> => {
    return res.status(status).json({status});
}

const ofStatusAndData = <T>(res: Response, status: number, data: T): Response<T> => {
    return res.status(status).json({status, data});
}

const ofStatusAndMessage = <T>(res: Response, status: number, message: string): Response<T> => {
    return res.status(status).json({status, message});
}

export default {of, ofStatus, ofStatusAndData, ofStatusAndMessage}
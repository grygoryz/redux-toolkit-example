import {createAction, createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import axios from "../../axios";
import {getCurrentBrandId} from "./selectors";

// название данной ветки стора
const name = 'brand';

const URL = '/site/vendors';
const URL_HITS = '/site/goods/brands';

// Если какой-либо экшен требуется вызвать в thunk экшене, созданном при помощи createAsyncThunk, то
// делаем это таким образом. createAction возвращает action creator с указанным типом и payload в качестве параметра
export const setCurrentGroup = createAction(`${name}/setCurrentGroup`);

// Такой способ создания thunk экшенов позволяет не описывать из раза в раз одинаковые экшены (типа
// requestBrandStart, requestBrandFailure и т.д..), предоставляя более удобное API (см. extraReducers в brandSlice).
// Ф-я имеет 3 параметра:
// 1. typePrefix - строка, на основе которой генерируются экшен типы (brand/requestBrand/pending, brand/requestBrand/fulfilled, brand/requestBrand/rejected)
// 2. payloadCreator - сама thunk ф-я. Принимает payload, а также обьект thunkAPI - { dispatch, getState, rejectWithValue, ... }.
// При успехе возвращенное значение попадает прямо в payload extraReducer_a, а при ошибке для этого нужно вызвать ф-ю rejectWithValue с желаемым значением
// 3. options - обьект опций { condition, dispatchConditionRejection }.
// - condition - ф-я, которая принимает payload и обьект { getState, extra }. Она вызывается перед
// payloadCreator и если возвращенное значение равно false, то это приводит к отмене вызова.
// - dispatchConditionRejection - boolean значение. Если true - то при отмене thunk_и будет диспатчиться reject
export const requestBrand = createAsyncThunk(
    `${name}/requestBrand`,
    async (brandId, {dispatch, rejectWithValue}) => {
        try {
            const res = await axios.get(`${URL}/${brandId}`)
            dispatch(setCurrentGroup(brandId));

            return res.data;
        } catch (e) {
            rejectWithValue(e.message);
        }
    }, {
        condition(brandId, { getState }) {
            const currentBrandId = getCurrentBrandId(getState());
            const hasData = currentBrandId === +brandId;

            return !hasData;
        }
    }
);

const initialState = {
    data: {},
    data_hits: [],
    currentGroup: null,
    showBanner: false,
    loading: false,
    loading_hits: false,
    error: null,
    error_hits: null,
}

const brandSlice = createSlice({
    name,
    initialState,
    reducers: {
        requestHitsStart: state => {
            state.loading_hits = true;
        },
        requestHitsSuccess: (state, { payload }) => {
            state.data_hits = payload;
            state.loading_hits = false;
            state.error_hits = null;
        },
        requestHitsFailure: (state, { payload }) => {
            state.loading = false;
            state.error_hits = payload;
        },
        [setCurrentGroup]: (state, { payload }) => {
            state.currentGroup = payload;
        },
        resetCurrentGroup: state => {
            state.currentGroup = null;
        },
        toggleShowBanner: state => {
            state.showBanner = !state.showBanner;
        }
    },
    extraReducers: {
        [requestBrand.pending]: state => {
            state.loading = true;
        },
        [requestBrand.fulfilled]: (state, { payload }) => {
            state.data = payload;
            state.loading = false;
            state.error = null;
        },
        [requestBrand.rejected]: (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        },
    }
})

// достаем все экшены деструктуризацией, к защищенным добавляем префикс '_'
const {
    requestHitsStart: _requestHitsStart,
    requestHitsSuccess: _requestHitsSuccess,
    requestHitsFailure: _requestHitsFailure,
    resetCurrentGroup,
    toggleShowBanner,
} = brandSlice.actions;

// для примера дана и обычная запись thunk экшена
export const requestBrandHits = brandName => async dispatch => {
    dispatch(_requestHitsStart());

    try {
        const res = await axios.post(URL_HITS, {
            scope: {
                byVendor: brandName,
            },
        });

        dispatch(_requestHitsSuccess(res.data));
    } catch (e) {
        dispatch(_requestHitsFailure(e.message));
    }
}

// экспорт публичных экшенов
export { resetCurrentGroup, toggleShowBanner };

// экспорт редьюсера
export default brandSlice.reducer;
